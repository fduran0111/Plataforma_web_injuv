"""Genera el certificado estándar de participación (formato INJUV, una página horizontal)."""
from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path

from injuv.config import PROJECT_ROOT
from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario

LOGO_PATH = PROJECT_ROOT / "frontend-react" / "public" / "logo-injuv.png"

MESES = (
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
)


def _fecha(dt: datetime | None) -> str:
    return f"{dt.day} de {MESES[dt.month - 1]} de {dt.year}" if dt else ""


def _fecha_rango(op: Oportunidad) -> str:
    if op.fecha_inicio_voluntariado and op.fecha_fin_voluntariado:
        if op.fecha_inicio_voluntariado == op.fecha_fin_voluntariado:
            return f"el día {_fecha(op.fecha_inicio_voluntariado)}"
        return f"entre el {_fecha(op.fecha_inicio_voluntariado)} y el {_fecha(op.fecha_fin_voluntariado)}"
    return ""


def _rut_formateado(rut: str | None) -> str:
    d = "".join(c for c in (rut or "") if c.isdigit() or c.lower() == "k").upper()
    if len(d) < 2:
        return rut or ""
    cuerpo, dv = d[:-1], d[-1]
    return f"{int(cuerpo):,}-{dv}".replace(",", ".")


def generar_certificado(p: Postulacion, op: Oportunidad, org: Organizacion | None, voluntario: Usuario) -> bytes:
    """PDF de una página (A4 horizontal) con los datos de la postulación."""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    w, h = landscape(A4)  # 842 x 595
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(w, h))

    azul = HexColor("#1d4ed8")
    tinta = HexColor("#0f1b2d")
    gris = HexColor("#5b6b82")

    # Marco doble
    c.setStrokeColor(azul)
    c.setLineWidth(2.5)
    c.rect(28, 28, w - 56, h - 56)
    c.setStrokeColor(tinta)
    c.setLineWidth(0.8)
    c.rect(36, 36, w - 72, h - 72)

    cx = w / 2
    y = h - 80

    # Logo (si el archivo existe)
    if LOGO_PATH.is_file():
        try:
            logo = ImageReader(str(LOGO_PATH))
            iw, ih = logo.getSize()
            altura = 52
            c.drawImage(logo, cx - (altura * iw / ih) / 2, y - altura + 14, height=altura, width=altura * iw / ih, mask="auto")
            y -= altura + 10
        except Exception:
            pass
    else:
        c.setFillColor(azul)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(cx, y, "INJUV")
        y -= 26

    c.setFillColor(gris)
    c.setFont("Helvetica", 10)
    c.drawCentredString(cx, y, "INSTITUTO NACIONAL DE LA JUVENTUD")
    y -= 20
    c.setFillColor(azul)
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(cx, y, "CERTIFICADO DE PARTICIPACIÓN")
    y -= 34

    c.setFillColor(tinta)
    c.setFont("Helvetica", 13)
    c.drawCentredString(cx, y, "Se certifica que")
    y -= 34

    nombre = f"{(voluntario.nombre or '').strip()} {(voluntario.apellido or '').strip()}".strip() or "Voluntario/a"
    rut = _rut_formateado(voluntario.rut)
    c.setFillColor(tinta)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(cx, y, nombre.upper())
    y -= 22
    if rut:
        c.setFillColor(gris)
        c.setFont("Helvetica", 12)
        c.drawCentredString(cx, y, f"RUT {rut}")
        y -= 28
    else:
        y -= 8

    c.setFillColor(tinta)
    c.setFont("Helvetica", 13)
    c.drawCentredString(cx, y, "participó en el voluntariado")
    y -= 26
    c.setFillColor(azul)
    c.setFont("Helvetica-Bold", 18)
    # Título en una o dos líneas si es muy largo
    titulo = (op.titulo or "").strip()
    if len(titulo) > 70:
        c.setFont("Helvetica-Bold", 15)
        corte = titulo.rfind(" ", 0, 70)
        c.drawCentredString(cx, y, f'"{titulo[:corte]}"')
        y -= 20
        c.drawCentredString(cx, y, f'"{titulo[corte:].strip()}"')
    else:
        c.drawCentredString(cx, y, f'"{titulo}"')
    y -= 30

    detalles: list[str] = []
    if org and org.nombre:
        detalles.append(f"realizado por {org.nombre}")
    rango = _fecha_rango(op)
    if rango:
        detalles.append(rango)
    horas = p.horas_voluntariado or op.horas_voluntariado
    if horas:
        detalles.append(f"con un total de {horas:g} horas de voluntariado")
    texto = ", ".join(detalles).capitalize()
    if texto:
        # Partir en dos líneas si queda largo
        if len(texto) > 80:
            corte = texto.rfind(" ", 0, 80)
            c.drawCentredString(cx, y, f"{texto[:corte]},")
            y -= 18
            c.drawCentredString(cx, y, texto[corte:].strip().rstrip(".") + ".")
        else:
            c.drawCentredString(cx, y, texto + ".")
    y -= 44

    c.setFillColor(gris)
    c.setFont("Helvetica", 11)
    lugar = f"{op.comuna_opor or op.ciudad_opor}, " if (op.comuna_opor or op.ciudad_opor) else ""
    c.drawCentredString(cx, y, f"{lugar}{_fecha(datetime.now())}")

    # Firmas
    y = 92
    c.setStrokeColor(tinta)
    c.setLineWidth(0.8)
    for fx in (cx - 180, cx + 180):
        c.line(fx - 80, y, fx + 80, y)
    c.setFillColor(tinta)
    c.setFont("Helvetica", 10)
    c.drawCentredString(cx - 180, y - 14, (org.nombre or "Organización")[:45] if org else "Organización")
    c.drawCentredString(cx + 180, y - 14, "Instituto Nacional de la Juventud")
    c.setFillColor(gris)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(cx, 44, f"Certificado N° {p.id} emitido por la plataforma de voluntariado INJUV · {datetime.now():%d-%m-%Y}")

    c.showPage()
    c.save()
    return buf.getvalue()
