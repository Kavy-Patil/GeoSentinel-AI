"""
GeoSentinel AI — Production HTTP & SMTP Dispatch Server
Serves static Next.js export on port 8080 and handles live SMTP email dispatches via Gmail.
"""

import os
import sys
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "out")
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")

if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from smtp_service import send_alert_email, SMTP_HOST, SMTP_PORT, SMTP_USER, DEFAULT_RECIPIENTS

PORT = 8080

class GeoSentinelHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=OUT_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable overly aggressive caching for dynamic updates
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/smtp/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status_payload = {
                "configured": True,
                "smtpHost": SMTP_HOST,
                "smtpPort": SMTP_PORT,
                "sender": SMTP_USER,
                "status": "ONLINE",
                "defaultRecipients": DEFAULT_RECIPIENTS
            }
            self.wfile.write(json.dumps(status_payload).encode("utf-8"))
            return

        # Fallback to standard static file handling
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/send-alert" or self.path == "/api/alerts/dispatch":
            content_len = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            
            try:
                data = json.loads(raw_body)
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}).encode("utf-8"))
                return

            location = data.get("location", "Reported Location")
            category = data.get("category", "urban")
            subject = data.get("subject") or f"[GeoSentinel AI Alert] {category.upper()} at {location}"
            body_text = data.get("body") or f"Automated satellite alert for {location} [{category}]."
            recipients = data.get("recipients") or DEFAULT_RECIPIENTS
            score = data.get("score", "90.0")
            incident_id = data.get("incidentId") or data.get("incident_id")

            metadata = {
                "incident_id": incident_id,
                "location": location,
                "category": category,
                "score": str(score),
                "source": "GeoSentinel Web Platform"
            }

            print(f"[SMTP RELAY] Dispatching alert for '{location}' to {recipients} via {SMTP_HOST}:{SMTP_PORT}...")
            result = send_alert_email(
                subject=subject,
                body_text=body_text,
                recipients=recipients,
                metadata=metadata
            )
            print(f"[SMTP RELAY] Delivery status: {result['status']}")

            is_success = result["status"] == "DELIVERED"
            self.send_response(200 if is_success else 500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            response_data = {
                "success": is_success,
                "status": result["status"],
                "incidentId": result["incident_id"],
                "recipients": result["recipients"],
                "sender": result["sender"],
                "smtpHost": result["smtp_host"],
                "timestamp": result["timestamp"],
                "error": result.get("error")
            }
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
            return

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

def run():
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadingHTTPServer(server_address, GeoSentinelHandler)
    print(f"GeoSentinel AI Platform & SMTP Server running on http://localhost:{PORT}")
    print(f"Serving static files from: {OUT_DIR}")
    print(f"SMTP Relay active: {SMTP_USER} via {SMTP_HOST}:{SMTP_PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    run()
