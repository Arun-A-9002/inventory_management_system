from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from PIL import Image
import io
from sqlalchemy.orm import Session

class PDFHeaderFormat:
    def __init__(self, db: Session):
        self.db = db
        self.styles = getSampleStyleSheet()
        self.logo_width = 35 * mm  # Print-friendly width (30-45mm range)
        self.logo_max_height = 15 * mm  # Print-friendly max height (10-18mm range)
        
    def create_header(self, canvas, doc, company_id: int = None):
        """
        Create PDF header with company details on left and logo on right
        
        Args:
            canvas: ReportLab canvas object
            doc: Document template
            company_id: Company ID to fetch details from database
        """
        # Fetch company data from database
        company_data = self._get_company_data(company_id)
        if not company_data:
            return
        # Get page dimensions
        page_width = A4[0]
        page_height = A4[1]
        
        # Header positioning - exact match to reference
        header_y = page_height - 30  # Very close to top
        left_margin = 40
        right_margin = page_width - 40
        
        # Logo section (left side) - always show placeholder if no logo
        self._draw_logo(canvas, company_data.get('logo_path'), left_margin, header_y)
            
        # Company details section (right side)
        self._draw_company_details(canvas, company_data, right_margin, header_y)
            
        # Draw separator line - positioned after all content
        canvas.setStrokeColor(colors.black)
        canvas.setLineWidth(1.5)
        canvas.line(left_margin, header_y - 85, right_margin, header_y - 85)
        
    def _get_company_data(self, company_id: int = None):
        """Fetch company data from database"""
        from models.tenant_models import Company
        
        try:
            if company_id:
                company = self.db.query(Company).filter(
                    Company.id == company_id,
                    Company.is_active == True
                ).first()
            else:
                # Get first active company if no ID specified
                company = self.db.query(Company).filter(
                    Company.is_active == True
                ).first()
                
            if not company:
                print("No company found in database")
                return None
                
            print(f"Found company: {company.name}, has logo: {company.logo_path is not None}")
            if company.logo_path:
                print(f"Logo path: {company.logo_path}")
                
            return {
                'name': company.name,
                'code': company.code,
                'gst_number': company.gst_number,
                'address': company.address,
                'contact_person': company.contact_person,
                'email': company.email,
                'phone': company.phone,
                'logo_path': company.logo_path if company.logo_path else None
            }
        except Exception as e:
            print(f"Error fetching company data: {e}")
            return None
        
    def _draw_company_details(self, canvas, company_data, right_x, y):
        """Draw company details on the right side"""
        canvas.setFont("Helvetica-Bold", 16)
        canvas.setFillColor(colors.HexColor("#2E8B57"))  # Sea green color
        
        # Company name - right aligned
        company_name = company_data.get('name', 'your companie')
        text_width = canvas.stringWidth(company_name.lower(), "Helvetica-Bold", 16)
        canvas.drawString(right_x - text_width, y, company_name.lower())
        
        # Subtitle/tagline - right aligned
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.grey)
        subtitle = 'INVENTORY MANAGEMENT SYSTEM'
        subtitle_width = canvas.stringWidth(subtitle, "Helvetica", 9)
        canvas.drawString(right_x - subtitle_width, y - 15, subtitle)
        
        # Contact details - right aligned
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.black)
        
        details_y = y - 30
        line_height = 10
        
        # Phone with + prefix
        if company_data.get('phone'):
            phone_text = f"+{company_data['phone']}"
            phone_width = canvas.stringWidth(phone_text, "Helvetica", 8)
            canvas.drawString(right_x - phone_width, details_y, phone_text)
            details_y -= line_height
            
        # Email
        if company_data.get('email'):
            email_width = canvas.stringWidth(company_data['email'], "Helvetica", 8)
            canvas.drawString(right_x - email_width, details_y, company_data['email'])
            details_y -= line_height
            
        # GST Number
        if company_data.get('gst_number'):
            gst_text = f"GST: {company_data['gst_number']}"
            gst_width = canvas.stringWidth(gst_text, "Helvetica", 8)
            canvas.drawString(right_x - gst_width, details_y, gst_text)
            details_y -= line_height
            
        # Address - right aligned, compact formatting
        if company_data.get('address'):
            address_lines = self._split_text(company_data['address'], 40)
            for line in address_lines[:2]:  # Max 2 lines
                line_width = canvas.stringWidth(line, "Helvetica", 8)
                canvas.drawString(right_x - line_width, details_y, line)
                details_y -= line_height
                
    def _draw_logo(self, canvas, logo_path, left_x, y):
        """Draw logo on the left side with 72mm width"""
        try:
            # Handle logo file path
            if logo_path:
                from pathlib import Path
                import os
                
                # Try multiple possible paths for the logo
                possible_paths = []
                
                # Get just the filename from the path
                filename = Path(logo_path).name
                
                # Try different locations
                possible_paths.extend([
                    Path('uploads') / filename,  # Current directory uploads
                    Path('backend/uploads') / filename,  # From root
                    Path(logo_path),  # Exact path as stored
                    Path('uploads') / logo_path,  # uploads + full path
                ])
                
                print(f"DEBUG: Logo path from DB: {logo_path}")
                print(f"DEBUG: Current working directory: {os.getcwd()}")
                print(f"DEBUG: Trying paths: {[str(p.absolute()) for p in possible_paths]}")
                
                logo_file_path = None
                for path in possible_paths:
                    if path.exists():
                        logo_file_path = path
                        print(f"DEBUG: Found logo at: {logo_file_path.absolute()}")
                        break
                
                if logo_file_path and logo_file_path.exists():
                    # Read logo file
                    with open(logo_file_path, 'rb') as f:
                        logo_data = f.read()
                    
                    if len(logo_data) > 0:
                        # Create PIL Image to get dimensions
                        img = Image.open(io.BytesIO(logo_data))
                        original_width, original_height = img.size
                        
                        # Calculate height maintaining aspect ratio but within limits
                        aspect_ratio = original_height / original_width
                        logo_height = self.logo_width * aspect_ratio
                        
                        # Ensure height doesn't exceed maximum
                        if logo_height > self.logo_max_height:
                            logo_height = self.logo_max_height
                            logo_width = logo_height / aspect_ratio
                        else:
                            logo_width = self.logo_width
                        
                        # Position logo on left side, aligned with company name level
                        logo_y = y - logo_height + 10  # Better alignment
                        
                        # Draw logo
                        canvas.drawInlineImage(
                            img,
                            left_x, logo_y,
                            width=logo_width,
                            height=logo_height
                        )
                        print(f"DEBUG: Logo drawn successfully at {left_x}, {logo_y}")
                        return  # Successfully drew logo, exit
                else:
                    print(f"DEBUG: Logo file not found in any of the attempted paths")
                    
        except Exception as e:
            print(f"ERROR: Error drawing logo: {e}")
            import traceback
            traceback.print_exc()
            
        # Fallback: draw placeholder on left side
        print(f"DEBUG: Drawing placeholder logo")
        canvas.setStrokeColor(colors.black)
        canvas.setFillColor(colors.lightgrey)
        placeholder_height = 50
        placeholder_y = y - placeholder_height + 15
        canvas.rect(left_x, placeholder_y, 
                   35 * mm, placeholder_height, fill=1, stroke=1)
        canvas.setFillColor(colors.black)
        canvas.setFont("Helvetica", 12)
        text_width = canvas.stringWidth("LOGO", "Helvetica", 12)
        canvas.drawString(left_x + (35 * mm - text_width) / 2, 
                         placeholder_y + 20, "LOGO")
                
    def _split_text(self, text, max_length):
        """Split text into lines of maximum length"""
        if not text:
            return []
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            if len(current_line + " " + word) <= max_length:
                current_line += " " + word if current_line else word
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
                
        if current_line:
            lines.append(current_line)
            
        return lines