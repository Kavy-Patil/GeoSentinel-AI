"""
GeoSentinel AI Alert Dispatch Engine
Transmits multi-agency critical satellite disaster alerts to designated recipient mailboxes
via authenticated Google SMTP gateway.
"""

import os
import sys
import json
import datetime
from smtp_service import send_alert_email, DEFAULT_RECIPIENTS, SMTP_USER, SMTP_HOST

def dispatch_alert(location: str, category: str, details: str, recipients: list = None, score: float = 88.5):
    if recipients is None:
        recipients = DEFAULT_RECIPIENTS

    cat_label = {
        "urban": "ILLEGAL URBAN ENCROACHMENT",
        "flood": "CRITICAL FLOOD INUNDATION",
        "landslide": "LANDSLIDE SLOPE FAILURE"
    }.get(category.lower(), category.upper())

    incident_id = f"GS-{category.upper()[:3]}-{datetime.datetime.now().strftime('%H%M%S')}"
    subject = f"[GeoSentinel AI Alert] CRITICAL: {cat_label} at {location} (#{incident_id})"
    
    body_text = (
        f"GEOSENTINEL AI SATELLITE DISASTER INTELLIGENCE DISPATCH\n"
        f"Incident ID: #{incident_id}\n"
        f"Monitoring Domain: {cat_label}\n"
        f"Location: {location}\n"
        f"Verification Score: {score}%\n\n"
        f"Satellite Finding Summary:\n"
        f"{details}\n\n"
        f"Dispatched via authenticated SMTP Gateway ({SMTP_USER} via {SMTP_HOST})."
    )

    metadata = {
        "incident_id": incident_id,
        "location": location,
        "category": cat_label,
        "score": str(score),
        "details": details
    }

    result = send_alert_email(
        subject=subject,
        body_text=body_text,
        recipients=recipients,
        metadata=metadata
    )

    print(f"Alert dispatch completed for {location} [{category}] with status: {result['status']}")
    for email in result["recipients"]:
        print(f" - {email} [SMTP STATUS: {result['status']}]")
    return result

if __name__ == "__main__":
    loc = sys.argv[1] if len(sys.argv) > 1 else "Assam"
    cat = sys.argv[2] if len(sys.argv) > 2 else "flood"
    det = sys.argv[3] if len(sys.argv) > 3 else "Monsoon flood overbank inundation +142.5 km2 confirmed by satellite intelligence."
    dispatch_alert(loc, cat, det)
