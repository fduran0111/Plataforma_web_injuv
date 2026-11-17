"""
Correo saliente por SMTP (variables MAIL_* del .env).

Si MAIL_USERNAME no está configurado, los envíos se omiten y solo se registran en el log.
Las funciones están pensadas para ejecutarse con `BackgroundTasks` y nunca lanzan excepciones.

Todos los correos salen desde la cuenta de la plataforma; cuando los envía una organización
se identifican con su nombre ("Fundación X vía INJUV") y las respuestas van a su `email_contacto`.
"""
from __future__ import annotations

import html
import logging
import os
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, parseaddr

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Remitente:
    """Organización en cuyo nombre se envía (texto plano: se usa fuera de la sesión de BD)."""

    nombre: str | None = None
    responder_a: str | None = None


def _limpio(valor: str | None) -> str:
    return " ".join((valor or "").split())


def remitente(org: object | None) -> Remitente | None:
    """Lee nombre y correo de contacto de la organización mientras la sesión sigue abierta."""
    if org is None:
        return None
    nombre = _limpio(getattr(org, "nombre", None)) or None
    correo = parseaddr(_limpio(getattr(org, "email_contacto", None)))[1]
    return Remitente(nombre, correo if "@" in correo else None)


def is_configured() -> bool:
    return bool((os.getenv("MAIL_USERNAME") or "").strip())


def _remitente_base() -> tuple[str, str]:
    """Nombre y dirección de la plataforma. MAIL_DEFAULT_SENDER acepta "Nombre <correo>",
    solo el correo, o solo el nombre (en ese caso la dirección es MAIL_USERNAME)."""
    usuario = _limpio(os.getenv("MAIL_USERNAME"))
    valor = _limpio(os.getenv("MAIL_DEFAULT_SENDER")).strip("\"'")
    if "@" not in valor:
        return valor or "INJUV", usuario
    nombre, direccion = parseaddr(valor)
    return nombre or "INJUV", direccion or usuario


def _layout(titulo: str, cuerpo_html: str, color: str = "#0052cc", firma: str = "Equipo INJUV") -> str:
    return f"""<!DOCTYPE html><html lang="es"><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
<div style="background:{color};color:#fff;padding:20px 24px"><h2 style="margin:0">{html.escape(titulo)}</h2></div>
<div style="padding:24px;color:#1f2937;line-height:1.6">{cuerpo_html}
<p style="margin-top:24px">Saludos,<br><strong>{html.escape(firma)}</strong></p></div></div></body></html>"""


def send_email(
    to: str | None,
    subject: str,
    titulo: str,
    cuerpo_html: str,
    color: str = "#0052cc",
    attachment: tuple[str, bytes, str] | None = None,
    de: Remitente | None = None,
) -> bool:
    if not to:
        return False
    if not is_configured():
        logger.info("Correo no configurado; se omite envío a %s (%s)", to, subject)
        return False
    msg = EmailMessage()
    nombre_base, direccion = _remitente_base()
    nombre = f"{de.nombre} vía {nombre_base}" if de and de.nombre else nombre_base
    msg["From"], msg["To"], msg["Subject"] = formataddr((nombre, direccion)), to, _limpio(subject)
    msg["Content-Language"] = "es"
    if de and de.responder_a:
        msg["Reply-To"] = formataddr((de.nombre or "", de.responder_a))
    msg.set_content("Este correo requiere un cliente compatible con HTML.")
    msg.add_alternative(_layout(titulo, cuerpo_html, color, de.nombre if de and de.nombre else "Equipo INJUV"), subtype="html")
    if attachment:
        name, data, mime = attachment
        maintype, subtype = mime.split("/", 1)
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=name)
    try:
        host = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        port = int(os.getenv("MAIL_PORT", "587"))
        if os.getenv("MAIL_USE_SSL", "false").lower() in ("1", "true", "yes"):
            server: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=20)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
            if os.getenv("MAIL_USE_TLS", "true").lower() in ("1", "true", "yes"):
                server.starttls()
        with server:
            server.login(os.getenv("MAIL_USERNAME", ""), os.getenv("MAIL_PASSWORD", ""))
            server.send_message(msg)
        return True
    except Exception:
        logger.exception("Error enviando correo a %s", to)
        return False


ESTADO_COLORES = {
    "Seleccionado": "#10b981",
    "No seleccionado": "#ef4444",
    "Pre-seleccionado": "#3b82f6",
    "Etapa de entrevista": "#8b5cf6",
    "En lista de espera": "#f59e0b",
}


def notify_postulacion_creada(
    email: str | None, nombre: str, oportunidad: str, organizacion: str, de: Remitente | None = None
) -> None:
    send_email(
        email,
        "Postulación recibida",
        "¡Recibimos tu postulación!",
        f"<p>Hola <strong>{html.escape(nombre)}</strong>,</p>"
        f"<p>Tu postulación a <strong>{html.escape(oportunidad)}</strong> de "
        f"<strong>{html.escape(organizacion)}</strong> fue registrada. La organización suele responder "
        "entre 5 y 15 días hábiles.</p>",
        de=de,
    )


def notify_cambio_estado(
    email: str | None, nombre: str, oportunidad: str, estado: str, motivo: str | None, de: Remitente | None = None
) -> None:
    extra = f"<p><strong>Motivo:</strong> {html.escape(motivo)}</p>" if motivo else ""
    send_email(
        email,
        f"Actualización de tu postulación: {estado}",
        "Actualización de tu postulación",
        f"<p>Hola <strong>{html.escape(nombre)}</strong>,</p>"
        f"<p>El estado de tu postulación a <strong>{html.escape(oportunidad)}</strong> ahora es "
        f"<strong>{html.escape(estado)}</strong>.</p>{extra}",
        ESTADO_COLORES.get(estado, "#0052cc"),
        de=de,
    )


def _fecha_txt(d) -> str:
    return d.strftime("%d-%m-%Y") if d else "sin fecha"


def notify_cambio_fechas(
    email: str | None,
    nombre: str,
    oportunidad: str,
    cambios: list[tuple[str, object, object]],
    motivo: str | None,
    de: Remitente | None = None,
) -> None:
    filas = "".join(
        f"<li><strong>{html.escape(campo)}:</strong> {_fecha_txt(antes)} → <strong>{_fecha_txt(despues)}</strong></li>"
        for campo, antes, despues in cambios
    )
    extra = f"<p><strong>Motivo:</strong> {html.escape(motivo)}</p>" if motivo else ""
    send_email(
        email,
        f"Cambio de fechas: {oportunidad}",
        "Cambiaron las fechas del voluntariado",
        f"<p>Hola <strong>{html.escape(nombre)}</strong>,</p>"
        f"<p>La organización actualizó las fechas de <strong>{html.escape(oportunidad)}</strong>:</p>"
        f"<ul>{filas}</ul>{extra}",
        "#f59e0b",
        de=de,
    )


def notify_oportunidad_cerrada(email: str | None, nombre: str, oportunidad: str, de: Remitente | None = None) -> None:
    send_email(
        email,
        "Convocatoria cerrada",
        "La convocatoria ha cerrado",
        f"<p>Hola <strong>{html.escape(nombre)}</strong>,</p>"
        f"<p>La oportunidad <strong>{html.escape(oportunidad)}</strong> cerró su convocatoria. "
        "Revisa el estado de tu postulación en tu perfil.</p>",
        "#6b7280",
        de=de,
    )


def send_mensaje_masivo(
    email: str | None, nombre: str, asunto: str, mensaje: str, oportunidad: str, organizacion: str, de: Remitente | None = None
) -> bool:
    cuerpo = html.escape(mensaje).replace("\n", "<br>")
    return send_email(
        email,
        asunto,
        organizacion,
        f"<p>Hola <strong>{html.escape(nombre)}</strong>,</p><p>{cuerpo}</p>"
        f"<p style='color:#6b7280'>Oportunidad: {html.escape(oportunidad)}</p>",
        de=de,
    )
