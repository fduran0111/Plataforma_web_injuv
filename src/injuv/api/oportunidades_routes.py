"""Oportunidades de voluntariado: listado público, gestión por organizaciones y postulación."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile, status
from sqlalchemy import Text, and_, cast, func, or_, select, update

from injuv.api.deps import CurrentUser, DbSession, MemberOrganization, OptionalUser
from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario
from injuv.schemas.oportunidades import CorreoMasivoBody, EstadoOportunidadBody, FechasBody, OportunidadBody, PostularBody
from injuv.security.rbac import is_admin, normalize_role
from injuv.services import files, mailer, serializers
from injuv.services.catalogo import ESTADO_DECLINADA, ESTADOS_OPORTUNIDAD_ABIERTOS

router = APIRouter(prefix="/oportunidades", tags=["Oportunidades"])

_FIELD_MAP = {"region": "region_opor", "ciudad": "ciudad_opor", "comuna": "comuna_opor"}


def _count_subquery():
    return (
        select(Postulacion.oportunidad_id, func.count(Postulacion.id).label("n"))
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
    """Admin INJUV o integrante de la organización dueña (miembros incluidos salvo `solo_admin_org`)."""
    org = db.get(Organizacion, op.organizacion_id)
    if is_admin(user.rol) or (org and org.id_usuario_org == user.id):
        return org
    if org and not solo_admin_org and user.organizacion_afiliada == org.id and user.id in (op.encargados_ids or []):
        return org
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "Solo los encargados de este voluntariado o el administrador de la organización pueden modificarlo",
    )


def ensure_can_view(db: DbSession, op: Oportunidad, user: Usuario) -> Organizacion | None:
    """Lectura del voluntariado y sus postulantes: cualquier integrante de la organización (o admin INJUV)."""
    org = db.get(Organizacion, op.organizacion_id)
    if is_admin(user.rol) or (org and (org.id_usuario_org == user.id or user.organizacion_afiliada == org.id)):
        return org
    raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permisos sobre esta oportunidad")


def _encargados_validos(db: DbSession, org: Organizacion, ids: list[int]) -> list[int]:
    """Solo integrantes de la organización (administrador o miembros), sin repetir."""
    validos = {org.id_usuario_org} if org.id_usuario_org else set()
    validos |= set(db.scalars(select(Usuario.id).where(Usuario.organizacion_afiliada == org.id)))
    invalidos = [i for i in ids if i not in validos]
    if invalidos:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Los encargados deben ser integrantes de la organización")
    return list(dict.fromkeys(ids))


def _serialize(db: DbSession, op: Oportunidad) -> dict[str, Any]:
    org = db.get(Organizacion, op.organizacion_id)
    n = db.scalar(select(func.count(Postulacion.id)).where(Postulacion.oportunidad_id == op.id)) or 0
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
def listar_de_mi_organizacion(db: DbSession, org: MemberOrganization) -> list[dict[str, Any]]:
    return listar(db, estado="todas", organizacion_id=org.id, limit=500)


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
            data["mi_postulacion"] = {"id": p.id, "estado": p.estado}
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
def crear(body: OportunidadBody, db: DbSession, org: MemberOrganization, user: CurrentUser) -> dict[str, Any]:
    _no_en_el_pasado({c: getattr(body, c) for c in _CAMPOS_FECHA})
    op = Oportunidad(organizacion_id=org.id, estado="activa", created_at=datetime.now())
    _apply_body(op, body)
    encargados = _encargados_validos(db, org, body.encargados_ids)
    if user.id != org.id_usuario_org and user.id not in encargados:
        encargados.append(user.id)  # un miembro que publica queda a cargo de su voluntariado
    op.encargados_ids = encargados
    db.add(op)
    db.commit()
    db.refresh(op)
    return _serialize(db, op)


@router.put("/{oportunidad_id}")
def actualizar(
    oportunidad_id: int, body: OportunidadBody, db: DbSession, user: CurrentUser, background: BackgroundTasks
) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org = ensure_can_manage(db, op, user)
    cambios = _cambios_de_fecha(op, {c: getattr(body, c) for c in _CAMPOS_FECHA})
    _no_en_el_pasado({c: nuevo for c, (_, nuevo) in cambios.items()})
    encargados = _encargados_validos(db, org, body.encargados_ids) if org else body.encargados_ids
    _apply_body(op, body)
    op.encargados_ids = encargados
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
        )
    ).all()
    for email, nombre in rows:
        background.add_task(mailer.notify_cambio_fechas, email, nombre or "", op.titulo, detalle, motivo)


@router.patch("/{oportunidad_id}/fechas")
def cambiar_fechas(
    oportunidad_id: int, body: FechasBody, db: DbSession, user: CurrentUser, background: BackgroundTasks
) -> dict[str, Any]:
    """Modificar o aplazar el cierre de postulaciones y el período del voluntariado."""
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
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
    ensure_can_manage(db, op, user)
    if body.estado != "cerrada":
        total = db.scalar(select(func.count(Postulacion.id)).where(Postulacion.oportunidad_id == op.id)) or 0
        if motivo := _motivo_cierre(op, total):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"No se puede reabrir: {motivo.lower()}. Edita la fecha límite o la meta primero.",
            )
    anterior, op.estado = op.estado, body.estado
    db.commit()
    if body.estado == "cerrada" and anterior != "cerrada":
        rows = db.execute(
            select(Usuario.email, Usuario.nombre)
            .join(Postulacion, Postulacion.usuario_id == Usuario.id)
            .where(Postulacion.oportunidad_id == op.id, Postulacion.estado != "No seleccionado")
        ).all()
        for email, nombre in rows:
            background.add_task(mailer.notify_oportunidad_cerrada, email, nombre or "", op.titulo)
    return _serialize(db, op)


@router.delete("/{oportunidad_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(oportunidad_id: int, db: DbSession, user: CurrentUser) -> None:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
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
        if tipo == "alternativas" and resp not in (q.get("opciones") or []):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f'La respuesta a "{q.get("texto", "")}" no es una de las alternativas')
        limpias[pid] = resp
    return limpias


@router.post("/{oportunidad_id}/postular", status_code=status.HTTP_201_CREATED)
def postular(
    oportunidad_id: int, db: DbSession, user: CurrentUser, background: BackgroundTasks, body: PostularBody | None = None
) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    if normalize_role(user.rol) != "user":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo las cuentas de voluntario pueden postular")
    if db.scalar(select(Postulacion.id).where(Postulacion.oportunidad_id == op.id, Postulacion.usuario_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya postulaste a esta oportunidad")
    total = db.scalar(select(func.count(Postulacion.id)).where(Postulacion.oportunidad_id == op.id)) or 0
    if op.estado in ESTADOS_OPORTUNIDAD_ABIERTOS and (motivo := _motivo_cierre(op, total)):
        op.estado = "cerrada"
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, motivo)
    if op.estado not in ESTADOS_OPORTUNIDAD_ABIERTOS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La oportunidad no está recibiendo postulaciones")
    now = datetime.now()
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
    background.add_task(
        mailer.notify_postulacion_creada, user.email, user.nombre or "", op.titulo, (org.nombre if org else "") or ""
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
        .where(Postulacion.oportunidad_id == op.id)
    )
    if body.filtro_estado != "todos":
        stmt = stmt.where(Postulacion.estado == body.filtro_estado)
    destinatarios = db.execute(stmt).all()
    if not destinatarios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No hay postulantes para ese filtro")
    org_nombre = (org.nombre if org else "") or "INJUV"
    enviados = sum(
        mailer.send_mensaje_masivo(email, nombre or "", body.asunto, body.mensaje, op.titulo, org_nombre)
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
    ensure_can_manage(db, op, user)
    name, _, _ = await files.save_upload(imagen, IMAGEN_FOLDER, f"op_{op.id}", files.IMAGE_EXTS, 5)
    files.delete(IMAGEN_FOLDER, op.imagen_filename)
    op.imagen_filename = name
    db.commit()
    return {"tiene_imagen": True}


@router.delete("/{oportunidad_id}/imagen")
def quitar_imagen(oportunidad_id: int, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
    files.delete(IMAGEN_FOLDER, op.imagen_filename)
    op.imagen_filename = None
    db.commit()
    return {"tiene_imagen": False}
