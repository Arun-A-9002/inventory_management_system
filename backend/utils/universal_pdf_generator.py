from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from datetime import datetime
from utils.pdf_header_format import PDFHeaderFormat
import io

class UniversalPDFGenerator:
    def __init__(self, db):
        self.db = db
        self.header_format = PDFHeaderFormat(db)
        self.styles = getSampleStyleSheet()
        
    def create_pdf(self, title, data, headers, filename, company_id=None, column_widths=None):
        """
        Universal PDF generator with company header
        
        Args:
            title: Report title (e.g., "AUDIT LOG REPORT", "INVENTORY REPORT")
            data: List of lists containing table data
            headers: List of column headers
            filename: PDF filename
            company_id: Company ID for header (optional)
            column_widths: List of column widths in inches (optional)
        
        Returns:
            PDF bytes buffer
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            topMargin=105, 
            bottomMargin=40, 
            leftMargin=40, 
            rightMargin=40
        )
        
        story = []
        
        # Title - centered
        title_style = self.styles['Title']
        title_style.alignment = 1  # Center alignment
        title_style.fontSize = 14
        title_style.spaceAfter = 5
        title_para = Paragraph(f"<b>{title}</b>", title_style)
        story.append(title_para)
        story.append(Spacer(1, 8))
        
        # Generated date - centered
        info_style = self.styles['Normal']
        info_style.alignment = 1
        info_style.fontSize = 9
        date_para = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", info_style)
        story.append(date_para)
        story.append(Spacer(1, 15))
        
        # Create table
        table_data = [headers] + data
        
        # Default column widths if not provided
        if not column_widths:
            page_width = A4[0] - 80  # Account for margins
            col_width = page_width / len(headers)
            column_widths = [col_width] * len(headers)
        else:
            column_widths = [w * inch for w in column_widths]
        
        table = Table(table_data, colWidths=column_widths)
        table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            
            # Data rows styling
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            
            # Grid and borders
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(table)
        
        # Build PDF with header
        def add_header(canvas, doc):
            self.header_format.create_header(canvas, doc, company_id)
        
        doc.build(story, onFirstPage=add_header, onLaterPages=add_header)
        buffer.seek(0)
        
        return buffer
    
    def create_simple_pdf(self, title, content, filename, company_id=None):
        """
        Create simple PDF with just text content and header
        
        Args:
            title: Report title
            content: Text content or list of paragraphs
            filename: PDF filename
            company_id: Company ID for header (optional)
        
        Returns:
            PDF bytes buffer
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            topMargin=105, 
            bottomMargin=40, 
            leftMargin=40, 
            rightMargin=40
        )
        
        story = []
        
        # Title
        title_style = self.styles['Title']
        title_style.alignment = 1
        title_style.fontSize = 14
        title_para = Paragraph(f"<b>{title}</b>", title_style)
        story.append(title_para)
        story.append(Spacer(1, 20))
        
        # Content
        if isinstance(content, list):
            for item in content:
                para = Paragraph(str(item), self.styles['Normal'])
                story.append(para)
                story.append(Spacer(1, 10))
        else:
            para = Paragraph(str(content), self.styles['Normal'])
            story.append(para)
        
        # Build PDF with header
        def add_header(canvas, doc):
            self.header_format.create_header(canvas, doc, company_id)
        
        doc.build(story, onFirstPage=add_header, onLaterPages=add_header)
        buffer.seek(0)
        
        return buffer

# Usage examples for different modules:

def create_inventory_report_pdf(db, inventory_data):
    """Example: Inventory Report"""
    pdf_gen = UniversalPDFGenerator(db)
    
    headers = ['Item Code', 'Item Name', 'Category', 'Stock', 'Unit Price']
    data = []  # Your inventory data here
    column_widths = [1.0, 2.0, 1.5, 0.8, 1.0]  # inches
    
    return pdf_gen.create_pdf(
        title="INVENTORY REPORT",
        data=data,
        headers=headers,
        filename="inventory_report.pdf",
        column_widths=column_widths
    )

def create_purchase_order_pdf(db, po_data):
    """Example: Purchase Order"""
    pdf_gen = UniversalPDFGenerator(db)
    
    headers = ['Item', 'Quantity', 'Unit Price', 'Total']
    data = []  # Your PO data here
    
    return pdf_gen.create_pdf(
        title="PURCHASE ORDER",
        data=data,
        headers=headers,
        filename="purchase_order.pdf"
    )

def create_sales_report_pdf(db, sales_data):
    """Example: Sales Report"""
    pdf_gen = UniversalPDFGenerator(db)
    
    headers = ['Date', 'Customer', 'Items', 'Amount', 'Status']
    data = []  # Your sales data here
    column_widths = [1.2, 1.5, 2.0, 1.0, 0.8]
    
    return pdf_gen.create_pdf(
        title="SALES REPORT",
        data=data,
        headers=headers,
        filename="sales_report.pdf",
        column_widths=column_widths
    )