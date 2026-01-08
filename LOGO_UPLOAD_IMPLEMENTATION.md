# Logo Upload Feature Implementation

## Overview
This implementation allows organizations to upload and manage company logos through the organization setup interface.

## How It Works

### Backend Implementation
1. **File Storage**: Logo files are stored in `frontend/public/uploads/` directory
2. **Database**: Only the file path is stored in the database (`logo_path` column)
3. **API Endpoints**:
   - `POST /company/` - Create company with logo upload
   - `PUT /company/{id}` - Update company with optional logo upload
   - `GET /company/{id}/logo` - Get logo file path
   - `GET /company/logo` - Get first company's logo path

### Frontend Implementation
1. **File Upload**: Uses HTML file input with image validation
2. **Preview**: Shows image preview before upload
3. **Display**: Shows uploaded logos in the company list
4. **Edit**: Allows logo updates in edit mode

## File Structure
```
backend/
├── routers/organization/company.py  # Logo upload endpoints
├── models/tenant_models.py          # Company model with logo_path
└── uploads/                         # Backend uploads (optional)

frontend/
├── public/uploads/                  # Logo files stored here
└── src/pages/organization/Company.jsx  # Logo upload UI
```

## Usage

### Creating a Company with Logo
1. Fill in company details
2. Select an image file using the file input
3. Preview will show the selected image
4. Click "Create Company" to save

### Updating Company Logo
1. Click "Edit" on an existing company
2. Use the logo file input to select a new image
3. Preview shows both current and new logo
4. Click "Save" to update

### Viewing Logos
- Logos appear in the company list table
- Stored as `/uploads/filename.ext` paths
- Served directly from `frontend/public/uploads/`

## Technical Details

### File Naming
- Format: `company_logo_{random_8_chars}.{extension}`
- Example: `company_logo_a1b2c3d4.png`

### Validation
- Only image files allowed (`image/*` MIME types)
- File type validation on both frontend and backend

### Database Schema
```sql
ALTER TABLE companies ADD COLUMN logo_path VARCHAR(255);
```

### Migration
Run `migrate_logo_to_path.py` to convert existing binary logo data to file paths.

## Security Considerations
1. File type validation prevents non-image uploads
2. Unique filenames prevent conflicts
3. Files stored in public directory for direct access
4. Old logo files are deleted when updating

## Error Handling
- Invalid file types show user-friendly error messages
- Failed uploads don't break the form
- Missing logos show placeholder in UI