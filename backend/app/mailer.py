"""이메일 발송

SMTP 설정(.env 의 SMTP_HOST 등)이 있으면 실제로 메일을 보낸다.
설정이 없으면(개발 모드) 메일을 보내지 않고 **서버 콘솔 로그**에 내용을 출력한다.
  → 인증 코드를 서버 콘솔에서 확인해 가입 흐름을 시험할 수 있다.
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def send_mail(to: str, subject: str, body: str) -> None:
    host = os.getenv("SMTP_HOST")
    if not host:
        logger.warning("[개발 모드: 메일 미발송] to=%s subject=%s\n%s", to, subject, body)
        return

    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or "noreply@localhost"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    port = int(os.getenv("SMTP_PORT", "587"))
    user, password = os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD")
    context = ssl.create_default_context()

    if port == 465:                                   # SSL 로 바로 접속
        with smtplib.SMTP_SSL(host, port, context=context, timeout=10) as smtp:
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
    else:                                             # 587 : 접속 후 STARTTLS 로 암호화
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls(context=context)
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
