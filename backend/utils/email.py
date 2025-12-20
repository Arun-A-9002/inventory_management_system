import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from utils.logger import log_error, log_audit

def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """Send email using SMTP configuration from .env"""
    try:
        # Get SMTP settings from environment
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM")

        if not all([smtp_host, smtp_user, smtp_password, smtp_from]):
            raise ValueError("Missing SMTP configuration in .env file")

        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg['Subject'] = subject

        # Attach body
        msg.attach(MIMEText(body, 'html' if is_html else 'plain'))

        # Connect and send
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()

        log_audit(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        log_error(e, f"Failed to send email to {to_email}")
        return False

def send_registration_email(admin_email: str, organization_name: str, admin_name: str):
    """Send registration confirmation email"""
    subject = f"Welcome to NUTRYAH IMS - {organization_name} Registration Confirmed"
    
    body = f"""
    <html>
    <body>
        <h2>Welcome to NUTRYAH Inventory Management System!</h2>
        
        <p>Dear {admin_name},</p>
        
        <p>Congratulations! Your organization <strong>{organization_name}</strong> has been successfully registered with NUTRYAH IMS.</p>
        
        <h3>What's Next?</h3>
        <ul>
            <li>You can now log in to your dashboard</li>
            <li>Set up your inventory structure</li>
            <li>Add users and assign roles</li>
            <li>Start managing your inventory efficiently</li>
        </ul>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>
        NUTRYAH IMS Team</p>
        
        <hr>
        <small>This is an automated message. Please do not reply to this email.</small>
    </body>
    </html>
    """
    
    return send_email(admin_email, subject, body, is_html=True)