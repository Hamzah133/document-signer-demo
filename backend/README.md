# Flask Backend Setup

## Installation

1. Create virtual environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The API will run on `http://localhost:5000`

## API Endpoints

- `GET /api/documents` - Get all documents
- `GET /api/documents/<id>` - Get specific document
- `POST /api/documents` - Create new document
- `PUT /api/documents/<id>` - Update document
- `POST /api/upload` - Upload PDF file
- `GET /uploads/<filename>` - Get uploaded file

## Data Storage

- PDFs stored in: `backend/uploads/`
- Document data stored in: `backend/data/` (JSON files)
