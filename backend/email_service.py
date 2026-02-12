import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


class EmailService:
    """Gmail SMTP email service for sending signing links with professional HTML templates"""

    def __init__(self):
        self.sender_email = os.getenv("GMAIL_ADDRESS", "zazashaik5@gmail.com")
        self.sender_password = os.getenv("GMAIL_APP_PASSWORD", "aksk wpad nuna ybaa")
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.brand_color = "#1E90FF"  # Dodgerblue
        self.hover_color = "#275082"  # Dark blue

    def _get_header_html(self):
        """Return consistent email header HTML"""
        return f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: {self.brand_color}; padding: 32px 0;">
          <tr>
            <td align="center">
              <h1 style="margin: 0; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700;">
                📄 Document Signer
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px;">
                Secure document signing made simple
              </p>
            </td>
          </tr>
        </table>
        """

    def _get_footer_html(self):
        """Return consistent email footer HTML"""
        return """
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F7F7; padding: 24px; border-top: 1px solid #E5E5E5; margin-top: 32px;">
          <tr>
            <td>
              <p style="margin: 0; color: #666666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.6;">
                This email was sent by Document Signer. Please do not reply to this email. If you have questions, contact the sender directly.<br><br>
                <strong>Security Notice:</strong> This link will expire in 30 days. Only click links from trusted senders.
              </p>
            </td>
          </tr>
        </table>
        """

    def send_signing_link(self, recipient_email, recipient_name, signing_link, document_name, sender_name="Document Signer"):
        """Send beautiful signing link to recipient via Gmail SMTP"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"✍️ Please Sign: {document_name}"
            message["From"] = self.sender_email
            message["To"] = recipient_email

            email_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #FFFFFF; color: #333333;">
              {self._get_header_html()}

              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 32px auto; padding: 0 20px;">
                <tr>
                  <td style="padding: 32px; background-color: #FFFFFF; border: 1px solid #E5E5E5;">
                    <h2 style="margin: 0 0 16px 0; color: #333333; font-size: 20px; font-weight: 700;">
                      You're invited to sign a document
                    </h2>

                    <p style="margin: 0 0 24px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      Hi <strong>{recipient_name}</strong>,
                    </p>

                    <p style="margin: 0 0 24px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      {sender_name} has requested your signature on:
                    </p>

                    <div style="background-color: #F7F7F7; padding: 16px; margin: 0 0 24px 0; border-left: 4px solid {self.brand_color};">
                      <p style="margin: 0; color: #333333; font-size: 16px; font-weight: 600;">
                        📋 {document_name}
                      </p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 24px 0;">
                          <a href="{signing_link}"
                             style="background-color: {self.brand_color}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 0; display: inline-block; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                            Sign Document Now
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 16px 0; color: #999999; font-size: 12px; text-align: center;">
                      Or copy this link:
                    </p>

                    <p style="margin: 0 0 24px 0; color: {self.brand_color}; font-size: 12px; word-break: break-all; text-align: center; font-family: 'Courier New', monospace;">
                      {signing_link}
                    </p>

                    <div style="background-color: #F0F8FF; padding: 16px; border-radius: 0; border: 1px solid #E5E5E5; margin: 0 0 24px 0;">
                      <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                        <strong>⏱️ This link expires in 30 days.</strong> Please complete your signature within this timeframe.
                      </p>
                    </div>

                    <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                      Questions? Reply to {sender_name} or contact them directly.<br><br>
                      Thank you,<br>
                      <strong>Document Signer Team</strong>
                    </p>
                  </td>
                </tr>
              </table>

              {self._get_footer_html()}
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

    def send_multi_sign_link(self, recipient_email, recipient_name, signing_link, document_name,
                            current_signer_num, total_signers, sender_name="Document Signer"):
        """Send multi-sign document link with progress info"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"✍️ Action Needed: {document_name} (Signer {current_signer_num} of {total_signers})"
            message["From"] = self.sender_email
            message["To"] = recipient_email

            email_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #FFFFFF; color: #333333;">
              {self._get_header_html()}

              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 32px auto; padding: 0 20px;">
                <tr>
                  <td style="padding: 32px; background-color: #FFFFFF; border: 1px solid #E5E5E5;">
                    <h2 style="margin: 0 0 24px 0; color: #333333; font-size: 20px; font-weight: 700;">
                      Your signature is needed
                    </h2>

                    <p style="margin: 0 0 24px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      Hi <strong>{recipient_name}</strong>,
                    </p>

                    <div style="background-color: #F0F8FF; padding: 16px; margin: 0 0 24px 0; border-left: 4px solid {self.brand_color}; border-radius: 0;">
                      <p style="margin: 0 0 8px 0; color: #333333; font-size: 14px; font-weight: 600;">
                        📋 {document_name}
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 13px;">
                        Signature {current_signer_num} of {total_signers} required
                      </p>
                    </div>

                    <!-- Progress visualization -->
                    <div style="margin: 0 0 24px 0;">
                      <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px; font-weight: 600;">
                        Progress
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #E5E5E5; height: 8px; border-radius: 0;">
                        <tr>
                          <td width="{int((current_signer_num - 1) / total_signers * 100)}%" style="background-color: {self.brand_color}; height: 8px;"></td>
                          <td style="height: 8px;"></td>
                        </tr>
                      </table>
                      <p style="margin: 8px 0 0 0; color: #666666; font-size: 12px;">
                        {current_signer_num - 1} of {total_signers} completed
                      </p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 24px 0;">
                          <a href="{signing_link}"
                             style="background-color: {self.brand_color}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 0; display: inline-block; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                            Sign Now (Your Turn)
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 24px 0; color: #999999; font-size: 12px; text-align: center;">
                      Or open this link:
                    </p>

                    <p style="margin: 0 0 24px 0; color: {self.brand_color}; font-size: 12px; word-break: break-all; text-align: center; font-family: 'Courier New', monospace;">
                      {signing_link}
                    </p>

                    <div style="background-color: #F0F8FF; padding: 16px; border-radius: 0; border: 1px solid #E5E5E5;">
                      <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                        <strong>💡 Tip:</strong> Once you sign, the next person in line will be notified automatically. Complete your signature within 30 days.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              {self._get_footer_html()}
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
        """Send beautifully formatted completion email with signed PDF"""
        try:
            from email.mime.application import MIMEApplication

            for recipient_email in recipients_emails:
                message = MIMEMultipart("alternative")
                message["Subject"] = f"✅ Completed: {document_name}"
                message["From"] = self.sender_email
                message["To"] = recipient_email

                email_body = f"""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #FFFFFF; color: #333333;">
                  {self._get_header_html()}

                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 32px auto; padding: 0 20px;">
                    <tr>
                      <td style="padding: 32px; background-color: #FFFFFF; border: 1px solid #E5E5E5;">
                        <div style="background-color: #D1FAE5; padding: 24px; margin: 0 0 24px 0; border-radius: 0; text-align: center; border-left: 4px solid #27AE60;">
                          <h2 style="margin: 0; color: #27AE60; font-size: 24px; font-weight: 700;">
                            ✓ All signatures complete!
                          </h2>
                        </div>

                        <p style="margin: 0 0 24px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          Great news! The document <strong>{document_name}</strong> has been successfully signed by all parties.
                        </p>

                        <div style="background-color: #F7F7F7; padding: 20px; margin: 0 0 24px 0; border-radius: 0;">
                          <p style="margin: 0 0 12px 0; color: #666666; font-size: 14px;">
                            <strong>📄 Document:</strong> {document_name}
                          </p>
                          <p style="margin: 0 0 12px 0; color: #666666; font-size: 14px;">
                            <strong>✓ Status:</strong> <span style="color: #27AE60; font-weight: 600;">SIGNED</span>
                          </p>
                          <p style="margin: 0; color: #666666; font-size: 14px;">
                            <strong>📅 Completed:</strong> {datetime.now().strftime('%B %d, %Y at %H:%M')} UTC
                          </p>
                        </div>

                        <p style="margin: 0 0 24px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          The fully executed and signed PDF document is attached to this email. Please save it for your records.
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 0 0 24px 0;">
                              <a href="https://example.com"
                                 style="background-color: {self.brand_color}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 0; display: inline-block; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                View in Document Signer
                              </a>
                            </td>
                          </tr>
                        </table>

                        <div style="background-color: #F0F8FF; padding: 16px; border-radius: 0; border: 1px solid #E5E5E5;">
                          <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                            <strong>🔒 Security Notice:</strong> This document contains all required signatures and is legally binding. Keep this email and the attached PDF for your official records.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  {self._get_footer_html()}
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
