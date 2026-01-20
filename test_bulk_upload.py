import pandas as pd
import io

# Test template generation
def test_template_generation():
    template_data = {
        'code': ['ITEM001'],
        'name': ['Paracetamol 500mg'],
        'qr_number': [''],
        'item_type': ['DRUG'],
        'is_consumable': [True],
        'is_active': [True],
        'lasa_flag': [False],
        'high_alert_flag': [False],
        'requires_prescription': [False],
        'description': ['Pain relief medication'],
        'category': ['Medicine'],
        'sub_category': ['Tablet'],
        'brand': ['Generic'],
        'manufacturer': ['ABC Pharma'],
        'min_stock': [10],
        'max_stock': [1000],
        'safety_stock': [5],
        'fixing_price': [5.50],
        'mrp': [6.00],
        'tax': [5.0],
        'has_expiry': [True],
        'expiry_date': ['2025-12-31'],
        'manufacture_date': ['2024-01-01'],
        'has_warranty': [False],
        'warranty_period': [0],
        'warranty_period_type': ['years'],
        'barcode': [''],
        'qr_code': ['']
    }
    
    df = pd.DataFrame(template_data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Items', index=False)
        
        # Get the workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets['Items']
        
        # Auto-adjust column widths
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    output.seek(0)
    
    # Save to file for testing
    with open('test_template.xlsx', 'wb') as f:
        f.write(output.read())
    
    print("Template generated successfully: test_template.xlsx")

if __name__ == "__main__":
    test_template_generation()