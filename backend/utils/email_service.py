import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Email configuration - set these in environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", EMAIL_USER)

def send_deadline_alert(staff_email: str, staff_name: str, transfer_no: str, 
                       return_deadline: str, days_left: int, pending_qty: int, location: str):
    """Send return deadline alert email"""
    
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("Email credentials not configured")
        return False
    
    try:
        subject = f"Return Reminder: {transfer_no} - Due in {days_left} days"
        
        body = f"""
        <html>
        <body>
            <h2>Return Deadline Reminder</h2>
            <p>Dear {staff_name},</p>
            
            <p>This is a reminder that you have <strong>{pending_qty} items</strong> 
            pending return for transfer <strong>{transfer_no}</strong>.</p>
            
            <p><strong>Details:</strong></p>
            <ul>
                <li>Transfer Number: {transfer_no}</li>
                <li>Location: {location}</li>
                <li>Return Deadline: {return_deadline}</li>
                <li>Days Remaining: {days_left}</li>
                <li>Pending Items: {pending_qty}</li>
            </ul>
            
            <p>Please ensure all items are returned by the deadline date.</p>
            
            <p>Best regards,<br>
            Inventory Management System</p>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = staff_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, staff_email, text)
        server.quit()
        
        print(f"Email sent to {staff_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email to {staff_email}: {e}")
        return False