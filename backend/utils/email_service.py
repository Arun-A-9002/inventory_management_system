import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
import io

# Email configuration - set these in environment variables
SMTP_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("SMTP_USER", "")
EMAIL_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("SMTP_FROM", EMAIL_USER)

def send_po_email_with_pdf(vendor_email: str, vendor_name: str, po_number: str, 
                          pr_number: str, location: str, items: list, pdf_buffer: io.BytesIO):
    """Send professional Purchase Order email with PDF attachment"""
    
    print(f"Attempting to send email to: {vendor_email}")
    print(f"SMTP Config - Host: {SMTP_SERVER}, Port: {SMTP_PORT}, User: {EMAIL_USER}")
    
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("Email credentials not configured")
        return False
    
    try:
        subject = f"Purchase Order {po_number} for PR {pr_number}"
        
        # Create professional email body
        items_text = "\n".join([f"- {item['item_name']} (Qty: {item['quantity']}) - Priority: {item.get('priority', 'Medium')}" for item in items])
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">Purchase Order</h2>
                    <p style="margin: 5px 0 0 0; color: #666;">Professional Purchase Order Document</p>
                </div>
                
                <p>Dear {vendor_name},</p>
                
                <p>Please find attached Purchase Order <strong>{po_number}</strong> for Purchase Request <strong>{pr_number}</strong>.</p>
                
                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Order Summary:</h3>
                    <div style="font-family: monospace; white-space: pre-line;">{items_text}</div>
                    <p style="margin: 10px 0 0 0;"><strong>Location:</strong> {location}</p>
                </div>
                
                <p>Please review the attached PDF document for complete details including:</p>
                <ul>
                    <li>Item specifications and quantities</li>
                    <li>Pricing and terms</li>
                    <li>Delivery requirements</li>
                    <li>Payment terms</li>
                </ul>
                
                <p><strong>Next Steps:</strong></p>
                <ol>
                    <li>Please confirm receipt of this Purchase Order</li>
                    <li>Provide delivery schedule confirmation</li>
                    <li>Share any clarifications if needed</li>
                </ol>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0;"><strong>Important:</strong> Please quote this PO number in all correspondence and delivery documents.</p>
                </div>
                
                <p>For any queries or clarifications, please contact our procurement team.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="margin: 0;">Best regards,</p>
                    <p style="margin: 5px 0;"><strong>Procurement Team</strong></p>
                    <p style="margin: 0; color: #666;">Inventory Management System</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = vendor_email
        msg['Subject'] = subject
        
        # Attach HTML body
        msg.attach(MIMEText(body, 'html'))
        
        # Attach PDF
        if pdf_buffer:
            pdf_buffer.seek(0)
            pdf_attachment = MIMEApplication(pdf_buffer.read(), _subtype='pdf')
            pdf_attachment.add_header('Content-Disposition', 'attachment', filename=f'purchase_order_{po_number}.pdf')
            msg.attach(pdf_attachment)
        
        print(f"Connecting to SMTP server: {SMTP_SERVER}:{SMTP_PORT}")
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        print("SMTP connection established, logging in...")
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        print("SMTP login successful, sending email...")
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, vendor_email, text)
        server.quit()
        
        print(f"PO email with PDF sent successfully to {vendor_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send PO email to {vendor_email}: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
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

def send_registration_email(admin_email: str, organization_name: str, admin_name: str):
    """Send registration confirmation email"""
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("Email credentials not configured")
        return False
    
    try:
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
        
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = admin_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, admin_email, text)
        server.quit()
        
        print(f"Registration email sent to {admin_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send registration email to {admin_email}: {e}")
        return False