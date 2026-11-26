"""Oportunidades de voluntariado: listado público, gestión por organizaciones y postulación."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile, status
from sqlalchemy import Text, and_, cast, func, or_, select, update

from injuv.api.deps import CurrentUser, DbSession, MemberOrganization, OptionalUser, OwnOrganization, es_admin_organizacion
from injuv.db.models import Asistencia, Oportunidad, Organizacion, Postulacion, Usuario
from injuv.schemas.oportunidades import AsistenciaDiaBody, CorreoMasivoBody, EncargadosBody, EstadoOportunidadBody, FechasBody, OportunidadBody, PostularBody
from injuv.security.rbac import is_admin, normalize_role
from injuv.services import files, mailer, notificaciones, serializers
from injuv.services.catalogo import ESTADO_DECLINADA, ESTADOS_OPORTUNIDAD_ABIERTOS, rechazo_participacion

router = APIRouter(prefix="/oportunidades", tags=["Oportunidades"])

_FIELD_MAP = {"region": "region_opor", "ciudad": "ciudad_opor", "comuna": "comuna_opor"}


def _count_subquery():
    # Los encargados (tutores) no cuentan como postulantes: sus postulaciones van aparte.
    return (
        select(Postulacion.oportunidad_id, func.count(Postulacion.id).label("n"))
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .where(~Oportunidad.encargados_ids.contains(func.jsonb_build_array(Postulacion.usuario_id)))
        .group_by(Postulacion.oportunidad_id)
        .subquery()
    )


def _motivo_cierre(op: Oportunidad, total: int) -> str | None:
    """Por qué una convocatoria ya no debería recibir postulaciones (None si puede seguir abierta)."""
    if op.fecha_limite_postulacion and op.fecha_limite_postulacion < date.today():
        return "La fecha límite de postulación ya pasó"
    if op.meta_postulantes and total >= op.meta_postulantes:
        return "Se alcanzó la meta de postulaciones"
    return None


def cerrar_convocatorias_vencidas(db: DbSession) -> None:
    """Cierra las convocatorias abiertas cuya fecha límite pasó o que alcanzaron su meta de postulantes."""
    counts = _count_subquery()
    ids = db.scalars(
        select(Oportunidad.id)
        .outerjoin(counts, counts.c.oportunidad_id == Oportunidad.id)
        .where(
            Oportunidad.estado.in_(ESTADOS_OPORTUNIDAD_ABIERTOS),
            or_(
                Oportunidad.fecha_limite_postulacion < date.today(),
                and_(Oportunidad.meta_postulantes > 0, func.coalesce(counts.c.n, 0) >= Oportunidad.meta_postulantes),
            ),
        )
    ).all()
    if ids:
        db.execute(update(Oportunidad).where(Oportunidad.id.in_(ids)).values(estado="cerrada"))
        db.commit()


def get_oportunidad_or_404(db: DbSession, oportunidad_id: int) -> Oportunidad:
    op = db.get(Oportunidad, oportunidad_id)
    if not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oportunidad no encontrada")
    return op


def ensure_can_manage(db: DbSession, op: Oportunidad, user: Usuario, solo_admin_org: bool = False) -> Organizacion | None:
    """Admin INJUV, administrador de la organización ("super tutor") o, salvo `solo_admin_org`, un integrante
    encargado del voluntariado ("tutor": asistencia, horas, reseñas y correo a sus voluntarios)."""
    org = db.get(Organizacion, op.organizacion_id)
    if is_admin(user.rol) or es_admin_organizacion(user, org):
        return org
    if org and not solo_admin_org and user.organizacion_afiliada == org.id and user.id in (op.encargados_ids or []):
        return org
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "Solo el administrador de la organización puede hacer esto"
        if solo_admin_org
        else "Solo los tutores de este voluntariado o el administrador de la organización pueden hacer esto",
    )


def ensure_can_view(db: DbSession, op: Oportunidad, user: Usuario) -> Organizacion | None:
    """Lectura del voluntariado y sus postulantes: admin INJUV, administrador de la organización o un
    integrante encargado (tutor) de ese voluntariado."""
    org = db.get(Organizacion, op.organizacion_id)
    if is_admin(user.rol) or es_admin_organizacion(user, org):
        return org
    if org and user.organizacion_afiliada == org.id and user.id in (op.encargados_ids or []):
        return org
    raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permisos sobre esta oportunidad")


def _encargados_validos(db: DbSession, org: Organizacion | None, ids: list[int]) -> list[int]:
    """Solo integrantes de la organización (administrador o miembros), sin repetir."""
    unicos = list(dict.fromkeys(ids))
    if org is None:
        return unicos
    validos = {org.id_usuario_org} if org.id_usuario_org else set()
    validos |= set(db.scalars(select(Usuario.id).where(Usuario.organizacion_afiliada == org.id)))
    if any(i not in validos for i in unicos):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Los encargados deben ser integrantes de la organización")
    return unicos


def _serialize(db: DbSession, op: Oportunidad) -> dict[str, Any]:
    org = db.get(Organizacion, op.organizacion_id)
    n = db.scalar(
        select(func.count(Postulacion.id)).where(
            Postulacion.oportunidad_id == op.id,
            Postulacion.usuario_id.not_in(op.encargados_ids or [-1]),
        )
    ) or 0
    return serializers.oportunidad(op, org, n)


def _apply_body(op: Oportunidad, body: OportunidadBody) -> None:
    for field, value in body.model_dump(exclude={"ubicaciones", "preguntas"}).items():
        setattr(op, _FIELD_MAP.get(field, field), value)
    op.preguntas = [q.model_dump() for q in body.preguntas]
    if body.ubicaciones:
        # La primera ubicación es la principal: queda también en los campos clásicos
        # para que filtros, la app móvil y datos antiguos sigan funcionando.
        op.ubicaciones = [u.model_dump() for u in body.ubicaciones]
        principal = op.ubicaciones[0]
        op.region_opor, op.ciudad_opor, op.comuna_opor = principal["region"], principal["ciudad"], principal["comuna"]
    else:
        op.ubicaciones = [
            {"region": op.region_opor, "ciudad": op.ciudad_opor, "comuna": op.comuna_opor}
        ] if op.region_opor else []


@router.get("")
def listar(
    db: DbSession,
    estado: str | None = Query(None, description="activa | abierta | cerrada | todas"),
    region: str | None = None,
    area: str | None = None,
    q: str | None = None,
    organizacion_id: int | None = None,
    limit: int = Query(200, ge=1, le=500),
) -> list[dict[str, Any]]:
    cerrar_convocatorias_vencidas(db)
    counts = _count_subquery()
    stmt = (
        select(Oportunidad, Organizacion, func.coalesce(counts.c.n, 0))
        .outerjoin(Organizacion, Organizacion.id == Oportunidad.organizacion_id)
        .outerjoin(counts, counts.c.oportunidad_id == Oportunidad.id)
        .order_by(Oportunidad.created_at.desc().nullslast(), Oportunidad.id.desc())
        .limit(limit)
    )
    if estado and estado != "todas":
        stmt = stmt.where(Oportunidad.estado == estado)
    elif not estado:
        stmt = stmt.where(Oportunidad.estado.in_(ESTADOS_OPORTUNIDAD_ABIERTOS))
    if region:
        stmt = stmt.where(
            or_(
                Oportunidad.region_opor.ilike(f"%{region}%"),
                Organizacion.region.ilike(f"%{region}%"),
                cast(Oportunidad.ubicaciones, Text).ilike(f"%{region}%"),
            )
        )
    if area:
        stmt = stmt.where(Oportunidad.tipo_de_voluntariado.ilike(f"%{area}%"))
    if q:
        stmt = stmt.where(or_(Oportunidad.titulo.ilike(f"%{q}%"), Oportunidad.descripcion.ilike(f"%{q}%")))
    if organizacion_id:
        stmt = stmt.where(Oportunidad.organizacion_id == organizacion_id)
    return [serializers.oportunidad(op, org, n) for op, org, n in db.execute(stmt).all()]


@router.get("/mias")
def listar_de_mi_organizacion(db: DbSession, org: MemberOrganization, user: CurrentUser) -> list[dict[str, Any]]:
    """El administrador ve todos los voluntariados de su organización; un tutor, solo los que tiene a cargo."""
    lista = listar(db, estado="todas", organizacion_id=org.id, limit=500)
    if es_admin_organizacion(user, org):
        return lista
    return [op for op in lista if user.id in (op.get("encargados_ids") or [])]


@router.get("/tutorias")
def listar_mis_tutorias(db: DbSession, user: CurrentUser) -> list[dict[str, Any]]:
    """Voluntariados de su organización donde la cuenta es tutora (encargada), para la web y la app."""
    counts = _count_subquery()
    stmt = (
        select(Oportunidad, Organizacion, func.coalesce(counts.c.n, 0))
        .join(Organizacion, Organizacion.id == Oportunidad.organizacion_id)
        .outerjoin(counts, counts.c.oportunidad_id == Oportunidad.id)
        .where(
            Oportunidad.encargados_ids.contains([user.id]),
            or_(Organizacion.id_usuario_org == user.id, Oportunidad.organizacion_id == user.organizacion_afiliada),
        )
        .order_by(Oportunidad.created_at.desc())
    )
    return [serializers.oportunidad(op, org, n) for op, org, n in db.execute(stmt).all()]


@router.get("/{oportunidad_id}")
def obtener(oportunidad_id: int, db: DbSession, user: OptionalUser) -> dict[str, Any]:
    cerrar_convocatorias_vencidas(db)
    op = get_oportunidad_or_404(db, oportunidad_id)
    data = _serialize(db, op)
    data["mi_postulacion"] = None
    if user:
        p = db.scalar(
            select(Postulacion).where(Postulacion.oportunidad_id == op.id, Postulacion.usuario_id == user.id)
        )
        if p:
            data["mi_postulacion"] = {"id": p.id, "estado": p.estado, "estado_confirmacion": p.estado_confirmacion}
    return data


_CAMPOS_FECHA = {
    "fecha_limite_postulacion": "Cierre de postulaciones",
    "fecha_inicio_voluntariado": "Inicio del voluntariado",
    "fecha_fin_voluntariado": "Término del voluntariado",
}


def _no_en_el_pasado(valores: dict[str, date | None]) -> None:
    hoy = date.today()
    for campo, valor in valores.items():
        if valor and valor < hoy:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{_CAMPOS_FECHA[campo]}: la fecha no puede quedar en el pasado")


@router.post("", status_code=status.HTTP_201_CREATED)
def crear(body: OportunidadBody, db: DbSession, org: OwnOrganization) -> dict[str, Any]:
    _no_en_el_pasado({c: getattr(body, c) for c in _CAMPOS_FECHA})
    op = Oportunidad(organizacion_id=org.id, estado="activa", created_at=datetime.now())
    _apply_body(op, body)
    op.encargados_ids = _encargados_validos(db, org, body.encargados_ids)
    db.add(op)
    db.flush()
    notificaciones.notificar_varios(
        db,
        set(op.encargados_ids) - {org.id_usuario_org},
        "encargado_asignado",
        "Te asignaron un voluntariado",
        f"«{op.titulo}» quedó a tu cargo",
        f"/organizacion/oportunidades/{op.id}",
    )
    db.commit()
    db.refresh(op)
    return _serialize(db, op)


@router.put("/{oportunidad_id}")
def actualizar(
    oportunidad_id: int, body: OportunidadBody, db: DbSession, user: CurrentUser, background: BackgroundTasks
) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org = ensure_can_manage(db, op, user, solo_admin_org=True)
    cambios = _cambios_de_fecha(op, {c: getattr(body, c) for c in _CAMPOS_FECHA})
    _no_en_el_pasado({c: nuevo for c, (_, nuevo) in cambios.items()})
    anteriores = set(op.encargados_ids or [])
    encargados = _encargados_validos(db, org, body.encargados_ids)
    _apply_body(op, body)
    op.encargados_ids = encargados
    notificaciones.notificar_varios(
        db,
        set(encargados) - anteriores - {user.id},
        "encargado_asignado",
        "Te asignaron un voluntariado",
        f"«{op.titulo}» quedó a tu cargo",
        f"/organizacion/oportunidades/{op.id}",
    )
    db.commit()
    _avisar_cambio_fechas(db, op, cambios, None, background)
    return _serialize(db, op)


def _cambios_de_fecha(op: Oportunidad, nuevas: dict[str, date | None]) -> dict[str, tuple[date | None, date | None]]:
    return {c: (getattr(op, c), v) for c, v in nuevas.items() if getattr(op, c) != v}


def _avisar_cambio_fechas(
    db: DbSession,
    op: Oportunidad,
    cambios: dict[str, tuple[date | None, date | None]],
    motivo: str | None,
    background: BackgroundTasks,
) -> None:
    """Avisa por correo a quienes siguen en proceso (no a no seleccionados ni a quienes se retiraron)."""
    if not cambios:
        return
    detalle = [(_CAMPOS_FECHA[c], antes, despues) for c, (antes, despues) in cambios.items()]
    rows = db.execute(
        select(Usuario.email, Usuario.nombre)
        .join(Postulacion, Postulacion.usuario_id == Usuario.id)
        .where(
            Postulacion.oportunidad_id == op.id,
            Postulacion.estado.not_in(("No seleccionado", ESTADO_DECLINADA)),
            Postulacion.usuario_id.not_in(op.encargados_ids or [-1]),
        )
    ).all()
    de = mailer.remitente(db.get(Organizacion, op.organizacion_id))
    for email, nombre in rows:
        background.add_task(mailer.notify_cambio_fechas, email, nombre or "", op.titulo, detalle, motivo, de)


@router.patch("/{oportunidad_id}/fechas")
def cambiar_fechas(
    oportunidad_id: int, body: FechasBody, db: DbSession, user: CurrentUser, background: BackgroundTasks
) -> dict[str, Any]:
    """Modificar o aplazar el cierre de postulaciones y el período del voluntariado."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user, solo_admin_org=True)
    cambios = _cambios_de_fecha(op, {c: getattr(body, c) for c in _CAMPOS_FECHA})
    if not cambios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No cambiaste ninguna fecha")
    _no_en_el_pasado({c: nuevo for c, (_, nuevo) in cambios.items()})
    for campo, (_, nuevo) in cambios.items():
        setattr(op, campo, nuevo)
    db.commit()
    _avisar_cambio_fechas(db, op, cambios, body.motivo, background)
    return _serialize(db, op)


@router.patch("/{oportunidad_id}/estado")
def cambiar_estado(
    oportunidad_id: int,
    body: EstadoOportunidadBody,
    db: DbSession,
    user: CurrentUser,
    background: BackgroundTasks,
) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org = ensure_can_manage(db, op, user, solo_admin_org=True)
    if body.estado != "cerrada":
        total = db.scalar(
            select(func.count(Postulacion.id)).where(
                Postulacion.oportunidad_id == op.id,
                Postulacion.usuario_id.not_in(op.encargados_ids or [-1]),
            )
        ) or 0
        if motivo := _motivo_cierre(op, total):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"No se puede reabrir: {motivo.lower()}. Edita la fecha límite o la meta primero.",
            )
    de = mailer.remitente(org)
    anterior, op.estado = op.estado, body.estado
    db.commit()
    if body.estado == "cerrada" and anterior != "cerrada":
        rows = db.execute(
            select(Usuario.email, Usuario.nombre)
            .join(Postulacion, Postulacion.usuario_id == Usuario.id)
            .where(
                Postulacion.oportunidad_id == op.id,
                Postulacion.estado != "No seleccionado",
                Postulacion.usuario_id.not_in(op.encargados_ids or [-1]),
            )
        ).all()
        for email, nombre in rows:
            background.add_task(mailer.notify_oportunidad_cerrada, email, nombre or "", op.titulo, de)
    return _serialize(db, op)


@router.delete("/{oportunidad_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(oportunidad_id: int, db: DbSession, user: CurrentUser) -> None:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user, solo_admin_org=True)
    for p in db.scalars(select(Postulacion).where(Postulacion.oportunidad_id == op.id)):
        files.delete("certificados_voluntarios", p.ruta_certificado_pdf)
        db.delete(p)
    files.delete(IMAGEN_FOLDER, op.imagen_filename)
    db.delete(op)
    db.commit()


@router.get("/{oportunidad_id}/postulaciones")
def postulantes(oportunidad_id: int, db: DbSession, user: CurrentUser, estado: str | None = None) -> list[dict[str, Any]]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_view(db, op, user)
    stmt = (
        select(Postulacion, Usuario)
        .outerjoin(Usuario, Usuario.id == Postulacion.usuario_id)
        .where(Postulacion.oportunidad_id == op.id)
        .order_by(Postulacion.created_at.desc().nullslast())
    )
    if estado:
        stmt = stmt.where(Postulacion.estado == estado)
    return [serializers.postulacion_para_org(p, u, op) for p, u in db.execute(stmt).all()]


@router.get("/{oportunidad_id}/asistencias")
def asistencias_dia(oportunidad_id: int, fecha: date, db: DbSession, user: CurrentUser) -> list[dict[str, Any]]:
    """Asistencia registrada en una fecha concreta (historial diario del voluntariado)."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_view(db, op, user)
    rows = db.scalars(
        select(Asistencia)
        .join(Postulacion, Postulacion.id == Asistencia.postulacion_id)
        .where(Postulacion.oportunidad_id == op.id, Asistencia.fecha == fecha)
    ).all()
    return [{"postulacion_id": r.postulacion_id, "presente": r.presente} for r in rows]


@router.put("/{oportunidad_id}/asistencias")
def guardar_asistencias_dia(oportunidad_id: int, body: AsistenciaDiaBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    """Guarda la lista de un día: upsert por postulante y el flag de actividad sigue la última lista."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
    validos = {
        p.id: p
        for p in db.scalars(
            select(Postulacion).where(
                Postulacion.oportunidad_id == op.id,
                Postulacion.estado == "Seleccionado",
            )
        ).all()
        if not rechazo_participacion(p)
    }
    guardados = 0
    for reg in body.registros:
        p = validos.get(reg.postulacion_id)
        if p is None:
            continue
        row = db.get(Asistencia, (p.id, body.fecha))
        if row is None:
            db.add(Asistencia(postulacion_id=p.id, fecha=body.fecha, presente=reg.presente, registrado_por=user.id, updated_at=datetime.now()))
        else:
            row.presente = reg.presente
            row.registrado_por = user.id
            row.updated_at = datetime.now()
        p.asistencia_actividad = "SI" if reg.presente else "No"
        guardados += 1
    db.commit()
    return {"fecha": body.fecha.isoformat(), "registrados": guardados}


def _validar_respuestas(op: Oportunidad, respuestas: dict[str, str]) -> dict[str, str]:
    """Respuestas limpias y validadas contra las preguntas de la convocatoria (lanza 400 si faltan o son inválidas)."""
    preguntas = {q.get("id"): q for q in (op.preguntas or []) if isinstance(q, dict) and q.get("id")}
    limpias: dict[str, str] = {}
    for pid, q in preguntas.items():
        resp = (respuestas.get(pid) or "").strip()[:1000]
        if not resp:
            if q.get("obligatoria", True):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f'Falta responder la pregunta: "{q.get("texto", "")}"')
            continue
        tipo = q.get("tipo")
        if tipo == "si_no" and resp not in ("Sí", "No"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f'La respuesta a "{q.get("texto", "")}" debe ser Sí o No')
        if tipo == "alternativas":
            opciones = q.get("opciones") or []
            # Selección múltiple: varias alternativas separadas por salto de línea (una sola también vale).
            elegidas = list(dict.fromkeys(x.strip() for x in resp.split("\n") if x.strip())) if q.get("multiple") else [resp]
            if not elegidas or any(x not in opciones for x in elegidas):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f'La respuesta a "{q.get("texto", "")}" no es una de las alternativas')
            resp = "\n".join(elegidas)
        limpias[pid] = resp
    return limpias


def _encargados_detalle(db: DbSession, op: Oportunidad, org: Organizacion | None) -> list[dict[str, Any]]:
    ids = [x for x in (op.encargados_ids or []) if isinstance(x, int)]
    por_id = {u.id: u for u in db.scalars(select(Usuario).where(Usuario.id.in_(ids)))} if ids else {}
    return [
        {
            "id": u.id,
            "nombre": (u.nombre or "").strip(),
            "apellido": (u.apellido or "").strip(),
            "email": u.email or "",
            "miembro": bool(org and (u.id == org.id_usuario_org or u.organizacion_afiliada == org.id)),
        }
        for u in (por_id[i] for i in ids if i in por_id)
    ]


@router.get("/{oportunidad_id}/encargados")
def listar_encargados(oportunidad_id: int, db: DbSession, user: CurrentUser) -> list[dict[str, Any]]:
    """Encargados con nombre y correo; `miembro` indica si pertenecen a la organización o son externos."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    return _encargados_detalle(db, op, ensure_can_view(db, op, user))


@router.put("/{oportunidad_id}/encargados")
def actualizar_encargados(
    oportunidad_id: int, body: EncargadosBody, db: DbSession, user: CurrentUser
) -> list[dict[str, Any]]:
    """Solo cambia los encargados (lo usa la app móvil; la web los envía junto al formulario completo).
    Solo el administrador de la organización asigna tutores, y deben ser integrantes."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    org = ensure_can_manage(db, op, user, solo_admin_org=True)
    anteriores = set(op.encargados_ids or [])
    op.encargados_ids = _encargados_validos(db, org, body.encargados_ids)
    notificaciones.notificar_varios(
        db,
        set(op.encargados_ids) - anteriores - {user.id},
        "encargado_asignado",
        "Te asignaron un voluntariado",
        f"«{op.titulo}» quedó a tu cargo",
        f"/organizacion/oportunidades/{op.id}",
    )
    db.commit()
    return _encargados_detalle(db, op, org)


@router.post("/{oportunidad_id}/postular", status_code=status.HTTP_201_CREATED)
def postular(
    oportunidad_id: int, db: DbSession, user: CurrentUser, background: BackgroundTasks, body: PostularBody | None = None
) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    if normalize_role(user.rol) != "user":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo las cuentas de voluntario pueden postular")
    existente = db.scalar(
        select(Postulacion).where(Postulacion.oportunidad_id == op.id, Postulacion.usuario_id == user.id)
    )
    if existente and not rechazo_participacion(existente):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya postulaste a esta oportunidad")
    total = db.scalar(
        select(func.count(Postulacion.id)).where(
            Postulacion.oportunidad_id == op.id,
            Postulacion.usuario_id.not_in(op.encargados_ids or [-1]),
        )
    ) or 0
    if op.estado in ESTADOS_OPORTUNIDAD_ABIERTOS and (motivo := _motivo_cierre(op, total)):
        op.estado = "cerrada"
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, motivo)
    if op.estado not in ESTADOS_OPORTUNIDAD_ABIERTOS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La oportunidad no está recibiendo postulaciones")
    now = datetime.now()
    if existente:
        # Re-postulación tras retirarse: se reactiva la misma postulación en revisión.
        existente.estado = "Pendiente de revisión"
        existente.estado_confirmacion = "Pendiente"
        existente.respuestas = _validar_respuestas(op, (body.respuestas if body else {}) or {})
        existente.updated_at = now
        p = existente
    else:
        p = Postulacion(
            usuario_id=user.id,
            oportunidad_id=op.id,
            estado="Pendiente de revisión",
            estado_confirmacion="Pendiente",
            asistencia_capacitacion="No aplica",
            asistencia_actividad="No aplica",
            tiene_certificado=False,
            resena_org_publica=False,
            horas_voluntariado=0,
            respuestas=_validar_respuestas(op, (body.respuestas if body else {}) or {}),
            created_at=now,
            updated_at=now,
        )
        db.add(p)
        # Esta postulación completa la meta: la convocatoria se cierra en el mismo momento
        if op.meta_postulantes and total + 1 >= op.meta_postulantes:
            op.estado = "cerrada"
    db.commit()
    org = db.get(Organizacion, op.organizacion_id)
    admin_ids = {org.id_usuario_org} if org and org.id_usuario_org else set()
    if org:
        admin_ids |= set(
            db.scalars(
                select(Usuario.id).where(
                    Usuario.organizacion_afiliada == org.id, Usuario.organizacion_rol == "admin"
                )
            )
        )
    for admin_id in admin_ids:
        notificaciones.notificar(
            db,
            admin_id,
            "nueva_postulacion",
            "Nueva postulación",
            f"{(user.nombre or 'Un voluntario').strip()} postuló a «{op.titulo}»",
            f"/organizacion/oportunidades/{op.id}",
        )
    notificaciones.notificar(
        db,
        user.id,
        "postulacion_enviada",
        "Postulación enviada",
        f"Tu postulación a «{op.titulo}» fue recibida por {(org.nombre if org else 'la organización') or 'la organización'}",
        "/perfil",
    )
    db.commit()
    background.add_task(
        mailer.notify_postulacion_creada,
        user.email,
        user.nombre or "",
        op.titulo,
        (org.nombre if org else "") or "",
        mailer.remitente(org),
    )
    return {"id": p.id, "estado": p.estado}


@router.post("/{oportunidad_id}/correo-masivo")
def correo_masivo(oportunidad_id: int, body: CorreoMasivoBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org = ensure_can_manage(db, op, user)
    if not mailer.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "El correo saliente no está configurado en el servidor")
    stmt = (
        select(Usuario.email, Usuario.nombre)
        .join(Postulacion, Postulacion.usuario_id == Usuario.id)
        .where(
            Postulacion.oportunidad_id == op.id,
            Postulacion.usuario_id.not_in(op.encargados_ids or [-1]),
        )
    )
    if body.filtro_estado != "todos":
        stmt = stmt.where(Postulacion.estado == body.filtro_estado)
    if not is_admin(user.rol) and not es_admin_organizacion(user, org):
        # Un tutor solo escribe a los voluntarios que participan en su voluntariado.
        stmt = stmt.where(Postulacion.estado == "Seleccionado", Postulacion.estado_confirmacion != "No confirmado")
    destinatarios = db.execute(stmt).all()
    if not destinatarios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No hay postulantes para ese filtro")
    org_nombre = (org.nombre if org else "") or "INJUV"
    de = mailer.remitente(org)
    enviados = sum(
        mailer.send_mensaje_masivo(email, nombre or "", body.asunto, body.mensaje, op.titulo, org_nombre, de)
        for email, nombre in destinatarios
    )
    return {"enviados": enviados, "total": len(destinatarios)}


IMAGEN_FOLDER = "imagenes_oportunidades"


@router.get("/{oportunidad_id}/imagen")
def imagen_oportunidad(oportunidad_id: int, db: DbSession):
    """Imagen de la convocatoria (pública)."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    return files.send(IMAGEN_FOLDER, op.imagen_filename)


@router.put("/{oportunidad_id}/imagen")
async def subir_imagen(
    oportunidad_id: int, db: DbSession, user: CurrentUser, imagen: UploadFile = File(...)
) -> dict[str, Any]:
    """Banner opcional de la convocatoria: lo sube el encargado, el administrador de la org o INJUV."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user, solo_admin_org=True)
    name, _, _ = await files.save_upload(imagen, IMAGEN_FOLDER, f"op_{op.id}", files.IMAGE_EXTS, 5)
    files.delete(IMAGEN_FOLDER, op.imagen_filename)
    op.imagen_filename = name
    db.commit()
    return {"tiene_imagen": True}


@router.delete("/{oportunidad_id}/imagen")
def quitar_imagen(oportunidad_id: int, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user, solo_admin_org=True)
    files.delete(IMAGEN_FOLDER, op.imagen_filename)
    op.imagen_filename = None
    db.commit()
    return {"tiene_imagen": False}
