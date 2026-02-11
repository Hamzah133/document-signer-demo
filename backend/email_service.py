import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


class EmailService:
    """Gmail SMTP email service for sending signing links"""

    def __init__(self):
        self.sender_email = os.getenv("GMAIL_ADDRESS", "zazashaik5@gmail.com")
        self.sender_password = os.getenv("GMAIL_APP_PASSWORD", "aksk wpad nuna ybaa")
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587

    def send_signing_link(self, recipient_email, recipient_name, signing_link, document_name, sender_name="Document Signer"):
        """Send signing link to recipient via Gmail SMTP"""
        try:
            # Create email message
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Please Sign: {document_name}"
            message["From"] = self.sender_email
            message["To"] = recipient_email

            # Email body
            email_body = f"""
            <html>
              <body>
                <p>Hi {recipient_name},</p>
                <p>{sender_name} has requested your signature on the document: <strong>{document_name}</strong></p>
                <p>Please click the link below to review and sign:</p>
                <p><a href="{signing_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign Document</a></p>
                <p>Or copy this link: {signing_link}</p>
                <p>This link will expire in 30 days.</p>
                <p>Thank you!</p>
              </body>
            </html>
            """

            # Attach HTML body
            part = MIMEText(email_body, "html")
            message.attach(part)

            # Send email via Gmail SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())

            return {"success": True, "message": f"Email sent to {recipient_email}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_multi_sign_link(self, recipient_email, recipient_name, signing_link, document_name,
                            current_signer_num, total_signers, sender_name="Document Signer"):
        """Send multi-sign document link with progress info"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Sign Now: {document_name} ({current_signer_num} of {total_signers})"
            message["From"] = self.sender_email
            message["To"] = recipient_email

            email_body = f"""
            <html>
              <body>
                <p>Hi {recipient_name},</p>
                <p>{sender_name} has requested your signature on: <strong>{document_name}</strong></p>
                <p>Current Status: This document requires {total_signers} signatures</p>
                <p>Click your unique signing link:</p>
                <p><a href="{signing_link}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign Document</a></p>
                <p>Or copy this link: {signing_link}</p>
                <p>This link will expire in 30 days.</p>
                <p>Thank you!</p>
              </body>
            </html>
            """

            part = MIMEText(email_body, "html")
            message.attach(part)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())

            return {"success": True, "message": f"Email sent to {recipient_email}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_final_pdf(self, recipients_emails, document_name, pdf_data, sender_name="Document Signer"):
        """Send completed PDF to all recipients and sender"""
        try:
            from email.mime.application import MIMEApplication

            for recipient_email in recipients_emails:
                message = MIMEMultipart("mixed")
                message["Subject"] = f"Completed: {document_name} - Signed by all parties"
                message["From"] = self.sender_email
                message["To"] = recipient_email

                email_body = f"""
                <html>
                  <body style="font-family: Arial, sans-serif; color: #333;">
                    <p>Hello,</p>
                    <p>We are pleased to inform you that the document <strong>{document_name}</strong> has been successfully signed by all parties.</p>
                    <p>Please find the fully executed document attached to this email.</p>
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">This email was sent by Document Signer. The attached PDF contains all signatures and is ready for your records.</p>
                    <p>Thank you!</p>
                  </body>
                </html>
                """

                part = MIMEText(email_body, "html")
                message.attach(part)

                # Attach PDF
                if pdf_data:
                    pdf_part = MIMEApplication(pdf_data, _subtype="pdf")
                    pdf_part.add_header('Content-Disposition', 'attachment', filename=f"{document_name}_signed.pdf")
                    message.attach(pdf_part)

                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.sender_email, self.sender_password)
                    server.sendmail(self.sender_email, recipient_email, message.as_string())

            return {"success": True, "message": "Final PDF emails sent"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def log_email(self, log_data):
        """Log email send attempt"""
        import json
        try:
            log_file = os.path.join(os.path.dirname(__file__), 'data', 'email_log.json')

            with open(log_file, 'r') as f:
                email_log = json.load(f)

            log_entry = {
                "timestamp": datetime.now().isoformat(),
                **log_data
            }

            email_log["emails"].append(log_entry)

            with open(log_file, 'w') as f:
                json.dump(email_log, f, indent=2)

            return True
        except Exception as e:
            print(f"Failed to log email: {e}")
            return False
