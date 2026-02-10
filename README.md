# Document Signer

A web-based document signing application similar to DocuSign/Zoho Sign. Upload PDFs, add signature/text fields, share signing links, and download signed documents.

## Quick Start

### 1. Backend (Flask)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Backend runs on `http://localhost:5000`

### 2. Frontend (Angular)
```bash
npm install
ng serve
```
Frontend runs on `http://localhost:4200`

## How It Works

### For Document Creators:
1. **Dashboard** (`/`) - View all documents
2. **Upload PDF** - Click "New Document" and upload
3. **Add Fields** - Click field buttons (Signature, Text, Date, Initials)
4. **Position Fields** - Drag fields to correct positions
5. **Share Link** - Click "Share Link" to copy signing URL
6. **View Signed** - Completed docs show with signatures embedded

### For Signers:
1. **Open Link** - Click the signing link received
2. **Fill Fields** - Type in text boxes, select dates
3. **Sign** - Click signature fields to draw signature
4. **Finish** - Click "Finish Signing" when done
5. **Download** - Download the signed document

## Features

✅ PDF upload and rendering to images  
✅ Drag & drop field positioning  
✅ 4 field types (Signature, Text, Date, Initials)  
✅ Canvas-based signature drawing  
✅ No login required for signers  
✅ Auto-save to backend  
✅ Signatures burned into PDF images  
✅ Download signed documents  
✅ Status tracking (Draft → Sent → Completed)  
✅ Mobile-responsive signing page  

## Project Structure

```
document-signer/
├── backend/
│   ├── app.py              # Flask API
│   ├── requirements.txt    # Python dependencies
│   ├── uploads/            # Uploaded PDFs
│   └── data/               # Document JSON files
├── src/app/
│   ├── dashboard/          # Document list
│   ├── home/               # Editor (creator view)
│   ├── sign/               # Signing page (signer view)
│   ├── components/
│   │   └── signature-modal/  # Signature drawing
│   ├── services/
│   │   ├── api.service.ts     # Backend API
│   │   └── document.service.ts # State management
│   └── models/
│       └── document.model.ts  # Data models
```

## API Endpoints

```
GET    /api/documents          # List all documents
GET    /api/documents/:id      # Get specific document
POST   /api/documents          # Create new document
PUT    /api/documents/:id      # Update document
POST   /api/upload             # Upload PDF file
```

## Tech Stack

**Frontend:**
- Angular 19
- Angular CDK (Drag & Drop)
- PDF.js (PDF rendering)
- TypeScript

**Backend:**
- Flask (Python)
- Flask-CORS
- JSON file storage

## Key Concepts

### Document Flow
1. **Draft** - Creator is editing
2. **Sent** - Shared with signer
3. **Completed** - Signer finished, signatures burned in

### Signature Burning
When a signer completes a document, signatures and text are drawn directly onto the PDF page images using HTML Canvas. This creates a permanent, flattened version that can't be edited.

### No Authentication for Signers
Signers access documents via unique URLs (e.g., `/sign/abc123`). No account or login required - just click and sign.

## Development Notes

- PDFs are converted to images at 2x scale for quality
- Field positions stored as percentages for responsive layout
- Auto-save on every change
- Default recipient created automatically
- Completed documents are read-only

## Future Enhancements

- Multi-page field assignment
- Field resizing
- Email notifications
- PDF merging (proper PDF output instead of images)
- User authentication for creators
- Document templates
- Audit trail
- Multiple recipients per document

## License

MIT
