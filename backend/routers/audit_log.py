from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import AuditLog
from utils.pdf_header_format import PDFHeaderFormat
from typing import Optional
import json
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from datetime import datetime
import io

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("/test")
def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"message": "Audit log router is working"}

@router.get("/")
def get_audit_logs(
    db: Session = Depends(get_tenant_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None)
):
    """Get audit logs with pagination and filtering"""
    
    query = db.query(AuditLog)
    
    # Apply filters
    if module:
        query = query.filter(AuditLog.module.ilike(f"%{module}%"))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if user_name:
        query = query.filter(AuditLog.user_name.ilike(f"%{user_name}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    # Format response with all fields
    formatted_logs = []
    for log in logs:
        formatted_log = {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "old_values": json.loads(log.old_values) if log.old_values else None,
            "new_values": json.loads(log.new_values) if log.new_values else None,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "module": log.module,
            "description": log.description
        }
        formatted_logs.append(formatted_log)
    
    return {
        "logs": formatted_logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/print")
def print_audit_logs(
    db: Session = Depends(get_tenant_db),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    company_id: Optional[int] = Query(None)
):
    """Generate PDF for audit logs with company header"""
    
    # Build query with filters
    query = db.query(AuditLog)
    if module:
        query = query.filter(AuditLog.module.ilike(f"%{module}%"))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if user_name:
        query = query.filter(AuditLog.user_name.ilike(f"%{user_name}%"))
    
    logs = query.order_by(AuditLog.timestamp.desc()).all()
    
    # Create PDF with exact margins
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=105, bottomMargin=40, leftMargin=40, rightMargin=40)
    
    # Initialize header format
    header_format = PDFHeaderFormat(db)
    
    # Create story (content)
    story = []
    styles = getSampleStyleSheet()
    
    # Title - exactly like reference
    title_style = styles['Title']
    title_style.alignment = 1  # Center alignment
    title_style.fontSize = 14
    title_style.spaceAfter = 5
    title = Paragraph("<b>AUDIT LOG REPORT</b>", title_style)
    story.append(title)
    story.append(Spacer(1, 8))
    
    # Report info - exactly like reference
    info_style = styles['Normal']
    info_style.alignment = 1  # Center alignment
    info_style.fontSize = 9
    report_info = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", info_style)
    story.append(report_info)
    story.append(Spacer(1, 15))
    
    # Table data with better text handling
    table_data = [['Timestamp', 'User', 'Action', 'Module', 'Description']]
    
    for log in logs:
        timestamp = log.timestamp.strftime('%m-%d %H:%M') if log.timestamp else 'N/A'  # Shorter format
        user = (log.user_name or 'System')[:12]  # Limit to 12 chars
        action = (log.action or 'N/A')[:8]  # Limit to 8 chars
        module = (log.module or 'N/A')[:12]  # Limit to 12 chars
        description = (log.description or f"{log.action} on {log.table_name}")[:35]  # Limit to 35 chars
            
        table_data.append([timestamp, user, action, module, description])
    
    # Create table with optimized column widths
    table = Table(table_data, colWidths=[1.0*inch, 0.9*inch, 0.7*inch, 1.0*inch, 2.4*inch])
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
        header_format.create_header(canvas, doc, company_id)
    
    doc.build(story, onFirstPage=add_header, onLaterPages=add_header)
    
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=audit_log_report.pdf"}
    )

@router.post("/create-sample")
def create_sample_log(db: Session = Depends(get_tenant_db)):
    """Create a sample audit log entry"""
    sample_log = AuditLog(
        user_name="system",
        action="CREATE",
        table_name="test",
        record_id=1,
        module="SYSTEM",
        description="Sample audit log entry",
        ip_address="127.0.0.1"
    )
    db.add(sample_log)
    db.commit()
    return {"message": "Sample audit log created"}