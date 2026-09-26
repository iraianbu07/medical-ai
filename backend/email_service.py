"""
VITAL-GUARD AI — Email Alert Service
Sends email alerts when VGI exceeds critical threshold.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
import os

ALERT_EMAIL = "irai23092006@gmail.com"
# For sending emails, set these environment variables:
# SMTP_EMAIL = your gmail address
# SMTP_PASSWORD = your gmail app password (not regular password)
SMTP_EMAIL = "irai23092006@gmail.com"
SMTP_PASSWORD = "dzwxcwloiiodicdr"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

VGI_ALERT_THRESHOLD = 80


def send_critical_alert_email(patient_id: str, vgi: float, risk_category: str,
                                clinical_reasoning: str, hours: float, vitals: dict):
    """Send a critical alert email when VGI exceeds threshold. Runs in background thread."""
    def _send():
        if not SMTP_EMAIL or not SMTP_PASSWORD:
            print(f"[EMAIL ALERT] SMTP not configured. Would send alert for patient {patient_id} (VGI: {vgi})")
            print(f"[EMAIL ALERT] Set SMTP_EMAIL and SMTP_PASSWORD env variables to enable email alerts.")
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"🚨 CRITICAL ALERT — Patient {patient_id} — VGI {vgi}%"
            msg["From"] = SMTP_EMAIL
            msg["To"] = ALERT_EMAIL

            hr = vitals.get("heart_rate", "N/A")
            spo2 = vitals.get("spo2", "N/A")
            temp = vitals.get("temperature", "N/A")
            rr = vitals.get("respiratory_rate", "N/A")
            sbp = vitals.get("systolic_bp", "N/A")
            dbp = vitals.get("diastolic_bp", "N/A")

            html = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0e1a; color: #e2e8f0; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 16px; border: 1px solid #dc2626; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #991b1b, #dc2626); padding: 24px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 22px;">🚨 CRITICAL ALERT</h1>
                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">VITAL-GUARD AI Monitoring System</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 24px;">
                        <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #fca5a5;">
                                Patient {patient_id} — VitalGuard Index: {vgi}%
                            </p>
                            <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">
                                Risk Category: <strong style="color: #ef4444;">{risk_category}</strong>
                            </p>
                            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">
                                Est. Deterioration: <strong style="color: #fbbf24;">{hours} hours</strong>
                            </p>
                        </div>

                        <h3 style="color: #e2e8f0; font-size: 15px; margin-bottom: 12px;">Clinical Reasoning</h3>
                        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 20px; font-style: italic;">
                            {clinical_reasoning}
                        </p>

                        <h3 style="color: #e2e8f0; font-size: 15px; margin-bottom: 12px;">Current Vital Signs</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px;">Heart Rate</td>
                                <td style="padding: 8px 12px; color: #e2e8f0; font-weight: bold; text-align: right;">{hr} bpm</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px;">SpO₂</td>
                                <td style="padding: 8px 12px; color: #e2e8f0; font-weight: bold; text-align: right;">{spo2}%</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px;">Temperature</td>
                                <td style="padding: 8px 12px; color: #e2e8f0; font-weight: bold; text-align: right;">{temp}°C</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px;">Respiratory Rate</td>
                                <td style="padding: 8px 12px; color: #e2e8f0; font-weight: bold; text-align: right;">{rr}/min</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px;">Blood Pressure</td>
                                <td style="padding: 8px 12px; color: #e2e8f0; font-weight: bold; text-align: right;">{sbp}/{dbp} mmHg</td>
                            </tr>
                        </table>

                        <div style="margin-top: 24px; padding: 16px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px;">
                            <p style="margin: 0; color: #fbbf24; font-size: 13px; font-weight: bold;">⚡ Recommended Action</p>
                            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px;">
                                Immediate clinical review required. Please check the VITAL-GUARD AI dashboard for detailed analysis.
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 16px 24px; background: rgba(99, 102, 241, 0.04); border-top: 1px solid rgba(99, 102, 241, 0.08); text-align: center;">
                        <p style="margin: 0; color: #4b5563; font-size: 11px;">
                            VITAL-GUARD AI — Predictive Clinical Deterioration Monitoring System
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """

            text = f"""CRITICAL ALERT - VITAL-GUARD AI

Patient: {patient_id}
VitalGuard Index: {vgi}%
Risk Category: {risk_category}
Est. Deterioration: {hours} hours

Clinical Reasoning: {clinical_reasoning}

Vitals:
  Heart Rate: {hr} bpm
  SpO2: {spo2}%
  Temperature: {temp}°C
  Respiratory Rate: {rr}/min
  Blood Pressure: {sbp}/{dbp} mmHg

Immediate clinical review required.
"""

            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))

            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.sendmail(SMTP_EMAIL, ALERT_EMAIL, msg.as_string())

            print(f"[EMAIL ALERT] [OK] Critical alert email sent for patient {patient_id} (VGI: {vgi})")

        except Exception as e:
            print(f"[EMAIL ALERT] [FAIL] Failed to send email: {e}")

    # Run in background thread to not block the API response
    thread = threading.Thread(target=_send, daemon=True)
    thread.start()
