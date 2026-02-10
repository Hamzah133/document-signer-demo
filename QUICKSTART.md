# Document Signer - Quick Start Guide

## Setup

### 1. Backend (Flask API)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on: `http://localhost:5000`

### 2. Frontend (Angular)

```bash
# In project root
npm install
ng serve
```

Frontend runs on: `http://localhost:4200`

## Usage Flow

### 1. Dashboard (`/dashboard`)
- View all your documents
- Click "New Document" to create
- Click any document card to edit

### 2. Editor (`/editor`)

**Designer Mode:**
1. Upload PDF file
2. Add recipients (name + email)
3. Select a recipient from the list
4. Add fields (Signature, Text, Date, Initials)
5. Drag fields to position them
6. Click Preview to test

**Preview Mode:**
- Fill text fields
- Select dates
- Click signature fields to draw
- All changes auto-save

## Features

✅ Dashboard with document list
✅ PDF upload and rendering
✅ Multi-recipient support
✅ 4 field types (Signature, Text, Date, Initials)
✅ Drag & drop field positioning
✅ Signature drawing canvas
✅ Auto-save to backend
✅ Color-coded recipients
✅ Delete fields and recipients

## File Structure

```
document-signer/
├── backend/
│   ├── app.py              # Flask API
│   ├── requirements.txt
│   ├── uploads/            # PDF storage
│   └── data/               # Document JSON
├── src/app/
│   ├── dashboard/          # Document list
│   ├── home/               # Editor
│   ├── components/
│   │   └── signature-modal/
│   ├── services/
│   │   ├── api.service.ts
│   │   └── document.service.ts
│   └── models/
│       └── document.model.ts
```

## API Endpoints

- `GET /api/documents` - List all
- `GET /api/documents/:id` - Get one
- `POST /api/documents` - Create
- `PUT /api/documents/:id` - Update
- `POST /api/upload` - Upload PDF

## Next Steps

1. **Recipient-specific signing links**
2. **Email notifications**
3. **PDF merging with signatures**
4. **Field validation**
5. **Completion tracking**
6. **Authentication**
