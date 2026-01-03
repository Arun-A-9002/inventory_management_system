import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from database import DB_HOST, DB_USER, DB_PASSWORD, DB_PORT
import schedule
import time

# Email configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = "your-email@gmail.com"  # Replace with your email
EMAIL_PASSWORD = "your-app-password"  # Replace with your app password
FROM_EMAIL = "your-email@gmail.com"

def send_email(to_email, subject, body):
    """Send email notification"""
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, to_email, text)
        server.quit()
        
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def check_return_deadlines():
    """Check for upcoming return deadlines and send alerts"""
    try:
        # Connect to database
        engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/arun")
        
        with engine.connect() as conn:
            # Get transfers with upcoming deadlines (next 3 days)
            tomorrow = datetime.now() + timedelta(days=1)
            three_days = datetime.now() + timedelta(days=3)
            
            query = text("""
                SELECT 
                    et.id,
                    et.transfer_no,
                    et.staff_name,
                    et.staff_email,
                    et.return_deadline,
                    et.location,
                    SUM(eti.quantity - eti.returned_quantity - eti.damaged_quantity) as pending_qty
                FROM external_transfers et
                JOIN external_transfer_items eti ON et.id = eti.transfer_id
                WHERE et.return_deadline BETWEEN :tomorrow AND :three_days
                AND et.status = 'SENT'
                AND (eti.quantity - eti.returned_quantity - eti.damaged_quantity) > 0
                GROUP BY et.id
                HAVING pending_qty > 0
            """)
            
            result = conn.execute(query, {
                'tomorrow': tomorrow.strftime('%Y-%m-%d'),
                'three_days': three_days.strftime('%Y-%m-%d')
            })
            
            for row in result:
                transfer_no = row[1]
                staff_name = row[2]
                staff_email = row[3]
                return_deadline = row[4]
                location = row[5]
                pending_qty = row[6]
                
                if staff_email:
                    days_left = (return_deadline - datetime.now().date()).days
                    
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
                            <li>Return Deadline: {return_deadline.strftime('%d-%m-%Y')}</li>
                            <li>Days Remaining: {days_left}</li>
                            <li>Pending Items: {pending_qty}</li>
                        </ul>
                        
                        <p>Please ensure all items are returned by the deadline date.</p>
                        
                        <p>Best regards,<br>
                        Inventory Management System</p>
                    </body>
                    </html>
                    """
                    
                    send_email(staff_email, subject, body)
                    
    except Exception as e:
        print(f"Error checking deadlines: {e}")

def start_scheduler():
    """Start the email reminder scheduler"""
    # Schedule to run daily at 9 AM
    schedule.every().day.at("09:00").do(check_return_deadlines)
    
    print("Email reminder scheduler started...")
    print("Checking for return deadlines daily at 9:00 AM")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    # Test the function immediately
    print("Testing return deadline checker...")
    check_return_deadlines()
    
    # Start scheduler
    start_scheduler()