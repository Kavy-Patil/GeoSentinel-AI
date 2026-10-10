"""
GeoSentinel AI — Production SMTP Email Dispatch Engine
Configured with Google SMTP relay for real-time disaster alerts & evidence verification.
"""

import os
import sys
import json
import ssl
import smtplib
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Credentials configured per user request
SMTP_HOST = os.environ.get("GEOSENTINEL_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("GEOSENTINEL_SMTP_PORT", 587))
SMTP_USER = os.environ.get("GEOSENTINEL_SMTP_USER", "mishrasakshamm14@gmail.com")
SMTP_PASS = os.environ.get("GEOSENTINEL_SMTP_PASS", "mtmv klfa dcgp yaxm")
SENDER_DISPLAY = "GeoSentinel AI Disaster Intelligence"

DEFAULT_RECIPIENTS = [
    "mishrasakshamm14@gmail.com",
    "shettysoumya20032@gmail.com",
    "jeeapriltest@gmail.com"
]

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOG_FILE = os.path.join(BASE_DIR, "alert_dispatches.json")

def send_alert_email(
    subject: str,
    body_text: str,
    body_html: str = None,
    recipients: list = None,
    metadata: dict = None
) -> dict:
    """
    Sends an alert email via Gmail SMTP TLS to one or more recipient mailboxes.
    Returns status dict with delivery confirmation.
    """
    if recipients is None:
        recipients = DEFAULT_RECIPIENTS

    # Clean recipients list
    targets = [r.strip() for r in recipients if r and "@" in r]
    if not targets:
        targets = DEFAULT_RECIPIENTS

    timestamp = datetime.datetime.now().isoformat()
    incident_id = (metadata or {}).get("incident_id") or f"GS-ALERT-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{SENDER_DISPLAY} <{SMTP_USER}>"
    msg["To"] = ", ".join(targets)
    msg["Subject"] = subject
    msg["Date"] = smtplib.email.utils.formatdate(localtime=True)

    # Attach plain text
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    # Attach HTML version if available or generate default HTML
    if not body_html:
        loc = (metadata or {}).get("location", "Reported AOI")
        cat = (metadata or {}).get("category", "General Alert").upper()
        score = (metadata or {}).get("score", "N/A")
        
        body_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .card {{ max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }}
    .header {{ background: #0f172a; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid #0f766e; }}
    .header h2 {{ margin: 0; font-size: 18px; letter-spacing: 0.04em; }}
    .header p {{ margin: 6px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }}
    .content {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
    .badge-bar {{ display: flex; gap: 8px; margin-bottom: 16px; }}
    .badge {{ display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 4px; text-transform: uppercase; }}
    .badge-cat {{ background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }}
    .badge-verified {{ background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }}
    .info-box {{ background: #f8fafc; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 18px 0; border-radius: 0 6px 6px 0; }}
    .meta-table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }}
    .meta-table td {{ padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }}
    .meta-table td.lbl {{ font-weight: 700; color: #475569; width: 35%; }}
    .pre-block {{ background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }}
    .footer {{ background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>🚨 GEOSENTINEL AI DISASTER INTELLIGENCE DISPATCH</h2>
      <p>High-Priority Verified Satellite Alert · #{incident_id}</p>
    </div>
    <div class="content">
      <div class="badge-bar">
        <span class="badge badge-cat">{cat}</span>
        <span class="badge badge-verified">✓ SATELLITE VERIFIED ({score}%)</span>
      </div>
      <p><b>Attention Emergency Response Authorities:</b></p>
      <p>The GeoSentinel AI automated satellite observation engine has verified an active environmental / urban change event matching designated severity thresholds.</p>
      
      <table class="meta-table">
        <tr><td class="lbl">Incident ID</td><td><b>#{incident_id}</b></td></tr>
        <tr><td class="lbl">Location / AOI</td><td><b>{loc}</b></td></tr>
        <tr><td class="lbl">Observation Domain</td><td><b>{cat}</b></td></tr>
        <tr><td class="lbl">Verification Score</td><td><b>{score}%</b> (Satellite Ground Match Confirmed)</td></tr>
        <tr><td class="lbl">Timestamp</td><td>{timestamp}</td></tr>
        <tr><td class="lbl">SMTP Origin</td><td>{SMTP_USER} via {SMTP_HOST}</td></tr>
      </table>

      <div class="info-box">
        <b>Satellite Finding Summary:</b>
        <div style="margin-top:6px; font-size:13px; color:#334155;">
          {body_text.replace(chr(10), '<br>')}
        </div>
      </div>

      <p style="font-size:12px; color:#64748b;">
        This alert was transmitted automatically to all registered multi-agency authorities:
        <br><b>{', '.join(targets)}</b>
      </p>
    </div>
    <div class="footer">
      GeoSentinel AI 2.0 Enterprise Intelligence Network · Confidential Government & Municipal Dispatch
    </div>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(body_html, "html", "utf-8"))

    # Connect to Gmail SMTP & dispatch
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, targets, msg.as_string())

        status = "DELIVERED"
        error_detail = None
    except Exception as exc:
        status = "FAILED"
        error_detail = str(exc)

    # Record dispatch log
    dispatch_record = {
        "incident_id": incident_id,
        "timestamp": timestamp,
        "subject": subject,
        "recipients": targets,
        "sender": SMTP_USER,
        "smtp_host": SMTP_HOST,
        "status": status,
        "error": error_detail,
        "metadata": metadata or {}
    }

    try:
        records = []
        if os.path.exists(LOG_FILE):
            try:
                with open(LOG_FILE, "r", encoding="utf-8") as f:
                    records = json.load(f)
            except Exception:
                records = []
        records.append(dispatch_record)
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)
    except Exception as log_err:
        print(f"Warning: could not write log file: {log_err}", file=sys.stderr)

    return dispatch_record

if __name__ == "__main__":
    print(f"Testing SMTP credentials with {SMTP_USER} on {SMTP_HOST}:{SMTP_PORT}...")
    test_result = send_alert_email(
        subject="[GeoSentinel AI] SMTP Configuration Verification",
        body_text="GeoSentinel AI SMTP relay is now operational with credentials for mishrasakshamm14@gmail.com.",
        recipients=["mishrasakshamm14@gmail.com"],
        metadata={"incident_id": "GS-TEST-INIT", "location": "System Self-Test", "category": "SMTP Check", "score": "100"}
    )
    print("Result:", json.dumps(test_result, indent=2))
