from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import secrets
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database and models
from database import init_db, SessionLocal, engine
from models import User, Document, SignatureRequest, Base
import task_queue

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'data'
TEMPLATES_FOLDER = 'data/templates'

for folder in [UPLOAD_FOLDER, DATA_FOLDER, TEMPLATES_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Initialize database and task queue
@app.before_request
def startup():
    """Initialize database on first request"""
    if not hasattr(app, '_db_initialized'):
        init_db()
        # Ensure demo user exists
        db = SessionLocal()
        if not db.query(User).filter(User.email == 'demo@example.com').first():
            demo_user = User(
                email='demo@example.com',
                password='demo123',
                token='demo-token'
            )
            db.add(demo_user)
            db.commit()
        db.close()
        task_queue.start()
        app._db_initialized = True

@app.teardown_appcontext
def shutdown_session(exception=None):
    """Cleanup on shutdown"""
    if exception:
        print(f"App error: {exception}")

# ============ HELPER FUNCTIONS ============

def get_db():
    """Get database session"""
    return SessionLocal()

def get_user_from_token(token):
    """Get user from token - optimized with single query"""
    db = get_db()
    user = db.query(User).filter(User.token == token).first()
    db.close()
    return user

def create_signature_request_db(doc_id, signer_email, signer_name, order):
    """Create signature request in database"""
    db = get_db()
    access_token = str(uuid.uuid4())
    sig_req = SignatureRequest(
        id=str(uuid.uuid4())[:12],
        document_id=doc_id,
        signer_email=signer_email,
        signer_name=signer_name,
        access_token=access_token,
        status='pending',
        order=order
    )
    db.add(sig_req)
    db.commit()
    result = sig_req.to_dict()
    db.close()
    return result

def get_signature_request_by_token_db(access_token):
    """Get signature request by access token"""
    db = get_db()
    sig_req = db.query(SignatureRequest).filter(SignatureRequest.access_token == access_token).first()
    result = sig_req.to_dict() if sig_req else None
    db.close()
    return result

def update_signature_request_status_db(access_token, status, signed_at=None):
    """Update signature request status in database"""
    db = get_db()
    sig_req = db.query(SignatureRequest).filter(SignatureRequest.access_token == access_token).first()
    if sig_req:
        sig_req.status = status
        if signed_at:
            sig_req.signed_at = datetime.fromisoformat(signed_at)
        db.commit()
    db.close()

# ============ AUTHENTICATION ENDPOINTS ============

@app.route('/api/login', methods=['POST'])
def login():
    """Login user"""
    data = request.json
    db = get_db()
    user = db.query(User).filter(
        User.email == data.get('email'),
        User.password == data.get('password')
    ).first()

    if user:
        result = user.to_dict()
        db.close()
        return jsonify(result)

    db.close()
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    """Register new user"""
    data = request.json
    db = get_db()

    # Check if user exists
    existing = db.query(User).filter(User.email == data.get('email')).first()
    if existing:
        db.close()
        return jsonify({'error': 'User exists'}), 400

    # Create new user
    new_user = User(
        email=data.get('email'),
        password=data.get('password'),
        token=secrets.token_urlsafe(16)
    )
    db.add(new_user)
    db.commit()
    result = new_user.to_dict()
    db.close()

    return jsonify(result)

# ============ DOCUMENT ENDPOINTS ============

@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Get all documents for authenticated user"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    docs = db.query(Document).filter(Document.user_id == user.id).all()
    result = [doc.to_dict(include_requests=True) for doc in docs]
    db.close()

    return jsonify(result)

@app.route('/api/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    """Get single document by ID - must be authenticated and own it"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)

    db = get_db()
    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    # Verify user owns document (SECURITY FIX)
    if doc.user_id != user.id if user else None:
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    result = doc.to_dict(include_requests=True)
    db.close()
    return jsonify(result)

@app.route('/api/documents', methods=['POST'])
def create_document():
    """Create new document"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    db = get_db()

    doc = Document(
        id=data.get('id'),
        user_id=user.id,
        name=data.get('name', ''),
        pages=data.get('pages', []),
        fields=data.get('fields', []),
        recipients=data.get('recipients', []),
        status=data.get('status', 'draft'),
        is_template=data.get('isTemplate', False),
        template_id=data.get('templateId')
    )
    db.add(doc)
    db.commit()
    result = doc.to_dict()
    db.close()

    return jsonify(result)

@app.route('/api/documents/<doc_id>', methods=['PUT'])
def update_document(doc_id):
    """Update document"""
    data = request.json
    db = get_db()

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    doc.name = data.get('name', doc.name)
    doc.pages = data.get('pages', doc.pages)
    doc.fields = data.get('fields', doc.fields)
    doc.recipients = data.get('recipients', doc.recipients)
    doc.status = data.get('status', doc.status)
    doc.updated_at = datetime.utcnow()

    db.commit()
    result = doc.to_dict()
    db.close()

    return jsonify(result)

@app.route('/api/documents/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Delete document"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        db.close()
        return jsonify({'success': True})

    if doc.user_id != user.id:
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    db.delete(doc)
    db.commit()
    db.close()

    return jsonify({'success': True})

# ============ SIGNATURE ENDPOINTS ============

@app.route('/api/documents/<doc_id>/send-for-signature', methods=['POST'])
def send_for_signature(doc_id):
    """Send document for signatures - ASYNC EMAIL"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    recipients = data.get('recipients', [])

    db = get_db()
    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        db.close()
        return jsonify({'error': 'Document not found'}), 404

    if doc.user_id != user.id:
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    # Create signature requests and queue emails
    signature_requests = []
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4200')

    for idx, recipient in enumerate(recipients):
        sig_req = create_signature_request_db(
            doc_id,
            recipient['email'],
            recipient['name'],
            idx + 1
        )

        signing_link = f"{frontend_url}/sign/{sig_req['accessToken']}"

        # Queue email instead of sending synchronously (ASYNC FIX)
        task_queue.enqueue_signing_link(
            recipient['email'],
            recipient['name'],
            signing_link,
            doc.name,
            user.email
        )

        signature_requests.append(sig_req)

    # Update document status
    doc.status = 'sent'
    doc.sent_at = datetime.utcnow()
    db.commit()
    db.close()

    return jsonify({'success': True, 'signatureRequests': signature_requests})

@app.route('/api/sign/<access_token>', methods=['GET'])
def get_document_by_token(access_token):
    """Get document for signing (public, no auth required)"""
    sig_req = get_signature_request_by_token_db(access_token)
    if not sig_req:
        return jsonify({'error': 'Invalid or expired token'}), 401

    db = get_db()
    doc = db.query(Document).filter(Document.id == sig_req['documentId']).first()

    if not doc:
        db.close()
        return jsonify({'error': 'Document not found'}), 404

    # Mark as viewed
    if sig_req['status'] == 'pending':
        update_signature_request_status_db(access_token, 'viewed')

    # Filter fields for this signer
    signer_recipient = next(
        (r for r in doc.recipients if r['email'] == sig_req['signerEmail']),
        None
    )

    result = doc.to_dict()
    if signer_recipient:
        result['filteredFields'] = [f for f in doc.fields if f.get('recipientId') == signer_recipient['id']]
        result['currentSigner'] = {
            'email': sig_req['signerEmail'],
            'name': sig_req['signerName'],
            'recipientId': signer_recipient['id']
        }

    db.close()
    return jsonify(result)

@app.route('/api/sign/<access_token>/submit', methods=['POST'])
def submit_signature(access_token):
    """Submit signature - ASYNC PDF AND EMAIL"""
    sig_req = get_signature_request_by_token_db(access_token)
    if not sig_req:
        return jsonify({'error': 'Invalid token'}), 401

    data = request.json
    fields = data.get('fields', [])
    pages = data.get('pages', [])

    db = get_db()
    doc = db.query(Document).filter(Document.id == sig_req['documentId']).first()

    if not doc:
        db.close()
        return jsonify({'error': 'Document not found'}), 404

    # Update fields with signature
    for field in doc.fields:
        matching = next((f for f in fields if f['id'] == field['id']), None)
        if matching:
            field['value'] = matching.get('value')

    # Update pages
    doc.pages = pages

    # Mark signature request as signed
    update_signature_request_status_db(access_token, 'signed', datetime.utcnow().isoformat())

    # Check if all signed
    all_sig_reqs = db.query(SignatureRequest).filter(SignatureRequest.document_id == doc.id).all()
    all_signed = all(r.status == 'signed' for r in all_sig_reqs)

    if all_signed:
        doc.status = 'completed'
        doc.completed_at = datetime.utcnow()

        # Queue PDF generation and email (ASYNC FIX - remove from critical path)
        pdf_data = generate_pdf_from_pages(pages)

        all_emails = [r.signer_email for r in all_sig_reqs] + [doc.user.email]
        task_queue.enqueue_final_pdf(
            all_emails,
            doc.name,
            pdf_data,
            doc.user.email
        )

    db.commit()
    db.close()

    return jsonify({'success': True, 'allSigned': all_signed})

def generate_pdf_from_pages(pages):
    """Generate PDF from pages - helper function"""
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer)

    for page in pages:
        img_data = page['imageUrl'].split(',')[1]
        img_bytes = base64.b64decode(img_data)
        img = Image.open(BytesIO(img_bytes))

        width, height = img.size
        c.setPageSize((width, height))

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            img.save(tmp, format='PNG')
            tmp_path = tmp.name

        c.drawImage(tmp_path, 0, 0, width=width, height=height)
        os.unlink(tmp_path)
        c.showPage()

    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()

# ============ TEMPLATE ENDPOINTS ============

@app.route('/api/templates/<template_id>/send', methods=['POST'])
def send_template_to_recipients(template_id):
    """Send template to multiple recipients - ASYNC EMAIL"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    recipients = data.get('recipients', [])

    db = get_db()
    template = db.query(Document).filter(Document.id == template_id).first()

    if not template:
        db.close()
        return jsonify({'error': 'Template not found'}), 404

    if template.user_id != user.id:
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4200')
    sent_list = []

    for recipient in recipients:
        # Create new document from template
        import copy
        new_doc_id = str(uuid.uuid4())[:12]
        recipient_id = str(uuid.uuid4())

        new_fields = copy.deepcopy(template.fields)

        # Convert template fields (role-based) to document fields (recipientId-based)
        for field in new_fields:
            field['recipientId'] = recipient_id
            field.pop('role', None)

        new_recipient = {
            'id': recipient_id,
            'name': recipient['name'],
            'email': recipient['email'],
            'color': '#3b82f6',
            'order': 1
        }

        new_doc = Document(
            id=new_doc_id,
            user_id=user.id,
            name=f"{template.name} - {recipient['name']}",
            pages=template.pages,
            fields=new_fields,
            recipients=[new_recipient],
            status='sent',
            is_template=False,
            template_id=template_id
        )

        db.add(new_doc)
        db.commit()

        # Create signature request
        sig_req = create_signature_request_db(
            new_doc_id,
            recipient['email'],
            recipient['name'],
            1
        )

        signing_link = f"{frontend_url}/sign/{sig_req['accessToken']}"

        # Queue email instead of sending (ASYNC FIX)
        task_queue.enqueue_signing_link(
            recipient['email'],
            recipient['name'],
            signing_link,
            new_doc.name,
            user.email
        )

        sent_list.append({'email': recipient['email'], 'status': 'sent', 'documentId': new_doc_id})

    db.close()
    return jsonify({'success': True, 'sent': sent_list})

# ============ FILE ENDPOINTS ============

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload file"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file'}), 400

    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'{timestamp}_{filename}'
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    return jsonify({'filename': filename, 'path': filepath})

@app.route('/api/documents/<doc_id>/download', methods=['POST'])
def download_document(doc_id):
    """Download document as PDF"""
    data = request.json
    pages = data.get('pages', [])
    doc_name = data.get('name', 'document')

    if not pages:
        return jsonify({'error': 'No pages'}), 400

    pdf_data = generate_pdf_from_pages(pages)

    return send_file(
        BytesIO(pdf_data),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"{doc_name.replace('.pdf', '')}_signed.pdf"
    )

# ============ SHUTDOWN HANDLER ============

def shutdown_handler():
    """Graceful shutdown"""
    print("Shutting down...")
    task_queue.stop()

if __name__ == '__main__':
    import atexit
    atexit.register(shutdown_handler)
    app.run(debug=True, port=5000)
