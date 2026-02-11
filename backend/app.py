from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import json
import secrets
import uuid
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from email_service import EmailService

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'data'
USERS_FILE = 'data/users.json'
SIGNATURE_REQUESTS_FILE = 'data/signature_requests.json'
TEMPLATES_FOLDER = 'data/templates'

for folder in [UPLOAD_FOLDER, DATA_FOLDER, TEMPLATES_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

email_service = EmailService()

if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w') as f:
        json.dump({'users': [{'email': 'demo@example.com', 'password': 'demo123', 'token': 'demo-token'}]}, f)

if not os.path.exists(SIGNATURE_REQUESTS_FILE):
    with open(SIGNATURE_REQUESTS_FILE, 'w') as f:
        json.dump({'requests': []}, f)

def get_user_from_token(token):
    with open(USERS_FILE, 'r') as f:
        data = json.load(f)
        return next((u for u in data['users'] if u['token'] == token), None)

# ============ SIGNATURE REQUEST MANAGEMENT ============

def create_signature_request(doc_id, signer_email, signer_name, order):
    """Create signature request with unique access token"""
    access_token = str(uuid.uuid4())
    
    request_data = {
        'id': str(uuid.uuid4())[:12],
        'documentId': doc_id,
        'signerEmail': signer_email,
        'signerName': signer_name,
        'status': 'pending',
        'order': order,
        'accessToken': access_token,
        'createdAt': datetime.now().isoformat()
    }
    
    with open(SIGNATURE_REQUESTS_FILE, 'r') as f:
        data = json.load(f)
    
    data['requests'].append(request_data)
    
    with open(SIGNATURE_REQUESTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    
    return request_data

def get_signature_request_by_token(access_token):
    """Get signature request by access token"""
    with open(SIGNATURE_REQUESTS_FILE, 'r') as f:
        data = json.load(f)
    return next((r for r in data['requests'] if r['accessToken'] == access_token), None)

def update_signature_request_status(access_token, status, signed_at=None):
    """Update signature request status"""
    with open(SIGNATURE_REQUESTS_FILE, 'r') as f:
        data = json.load(f)
    
    for req in data['requests']:
        if req['accessToken'] == access_token:
            req['status'] = status
            if signed_at:
                req['signedAt'] = signed_at
            break
    
    with open(SIGNATURE_REQUESTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# ============ MULTI-PARTY ROUTING ENDPOINTS ============

@app.route('/api/documents/<doc_id>/send-for-signature', methods=['POST'])
def send_for_signature(doc_id):
    """Send document to external signers via email"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    recipients = data.get('recipients', [])
    
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    if not os.path.exists(filepath):
        return jsonify({'error': 'Document not found'}), 404
    
    with open(filepath, 'r') as f:
        doc = json.load(f)
    
    if doc.get('userId') != user['email']:
        return jsonify({'error': 'Forbidden'}), 403
    
    signature_requests = []
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4200')
    
    for idx, recipient in enumerate(recipients):
        sig_req = create_signature_request(
            doc_id,
            recipient['email'],
            recipient['name'],
            idx + 1
        )
        
        signing_link = f"{frontend_url}/sign/{sig_req['accessToken']}"
        
        email_service.send_signing_link(
            recipient['email'],
            recipient['name'],
            signing_link,
            doc.get('name', 'Document'),
            user['email']
        )
        
        signature_requests.append(sig_req)
    
    doc['status'] = 'sent'
    doc['sentAt'] = datetime.now().isoformat()
    doc['signatureRequests'] = signature_requests
    
    with open(filepath, 'w') as f:
        json.dump(doc, f, indent=2)
    
    return jsonify({'success': True, 'signatureRequests': signature_requests})

@app.route('/api/sign/<access_token>', methods=['GET'])
def get_document_by_token(access_token):
    """Get document by access token for signing"""
    sig_req = get_signature_request_by_token(access_token)
    if not sig_req:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    doc_id = sig_req['documentId']
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Document not found'}), 404
    
    with open(filepath, 'r') as f:
        doc = json.load(f)
    
    # Mark as viewed
    if sig_req['status'] == 'pending':
        update_signature_request_status(access_token, 'viewed')
    
    # Filter fields for this signer
    signer_recipient = next((r for r in doc.get('recipients', []) if r['email'] == sig_req['signerEmail']), None)
    if signer_recipient:
        doc['filteredFields'] = [f for f in doc.get('fields', []) if f.get('recipientId') == signer_recipient['id']]
        doc['currentSigner'] = {
            'email': sig_req['signerEmail'],
            'name': sig_req['signerName'],
            'recipientId': signer_recipient['id']
        }
    
    return jsonify(doc)

@app.route('/api/sign/<access_token>/submit', methods=['POST'])
def submit_signature(access_token):
    """Submit signature for a signer"""
    sig_req = get_signature_request_by_token(access_token)
    if not sig_req:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.json
    fields = data.get('fields', [])
    pages = data.get('pages', [])
    
    doc_id = sig_req['documentId']
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    
    with open(filepath, 'r') as f:
        doc = json.load(f)
    
    # Update fields
    for field in doc.get('fields', []):
        matching = next((f for f in fields if f['id'] == field['id']), None)
        if matching:
            field['value'] = matching.get('value')
    
    # Update pages
    doc['pages'] = pages
    
    # Mark signature request as signed
    update_signature_request_status(access_token, 'signed', datetime.now().isoformat())
    
    # Check if all signed
    with open(SIGNATURE_REQUESTS_FILE, 'r') as f:
        all_requests = json.load(f)['requests']
    
    doc_requests = [r for r in all_requests if r['documentId'] == doc_id]
    all_signed = all(r['status'] == 'signed' for r in doc_requests)
    
    if all_signed:
        doc['status'] = 'completed'
        doc['completedAt'] = datetime.now().isoformat()
        
        # Generate PDF from pages
        from reportlab.pdfgen import canvas as pdf_canvas
        from reportlab.lib.pagesizes import letter
        pdf_buffer = BytesIO()
        c = pdf_canvas.Canvas(pdf_buffer)
        
        for page in doc.get('pages', []):
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
        pdf_data = pdf_buffer.getvalue()
        
        # Send final PDF to all
        all_emails = [r['signerEmail'] for r in doc_requests] + [doc.get('userId', '')]
        email_service.send_final_pdf(
            all_emails,
            doc.get('name', 'Document'),
            pdf_data,
            doc.get('userId', 'Document Signer')
        )
    
    with open(filepath, 'w') as f:
        json.dump(doc, f, indent=2)
    
    return jsonify({'success': True, 'allSigned': all_signed})

@app.route('/api/templates/<template_id>/send', methods=['POST'])
def send_template_to_recipients(template_id):
    """Send template to multiple recipients - each gets their own copy"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    recipients = data.get('recipients', [])
    
    template_path = os.path.join(DATA_FOLDER, f'{template_id}.json')
    if not os.path.exists(template_path):
        return jsonify({'error': 'Template not found'}), 404
    
    with open(template_path, 'r') as f:
        template = json.load(f)
    
    if template.get('userId') != user['email']:
        return jsonify({'error': 'Forbidden'}), 403
    
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4200')
    sent_list = []
    
    for recipient in recipients:
        # Create new document instance from template
        new_doc_id = str(uuid.uuid4())[:12]
        recipient_id = str(uuid.uuid4())

        # Deep copy fields so each recipient gets independent fields
        import copy
        new_fields = copy.deepcopy(template['fields'])

        # Convert template fields (role-based) to document fields (recipientId-based)
        for field in new_fields:
            field['recipientId'] = recipient_id
            field.pop('role', None)  # Remove role field

        # Create recipient object
        new_recipient = {
            'id': recipient_id,
            'name': recipient['name'],
            'email': recipient['email'],
            'color': '#3b82f6',
            'order': 1
        }

        new_doc = {
            'id': new_doc_id,
            'name': f"{template['name']} - {recipient['name']}",
            'type': 'document',
            'pages': template['pages'],
            'fields': new_fields,
            'recipients': [new_recipient],
            'createdAt': datetime.now().isoformat(),
            'status': 'sent',
            'userId': user['email'],
            'isTemplate': False,
            'templateId': template_id
        }
        
        # Save new document
        new_doc_path = os.path.join(DATA_FOLDER, f'{new_doc_id}.json')
        with open(new_doc_path, 'w') as f:
            json.dump(new_doc, f, indent=2)
        
        # Create signature request
        sig_req = create_signature_request(
            new_doc_id,
            recipient['email'],
            recipient['name'],
            1
        )
        
        signing_link = f"{frontend_url}/sign/{sig_req['accessToken']}"
        
        # Send email
        email_result = email_service.send_signing_link(
            recipient['email'],
            recipient['name'],
            signing_link,
            new_doc['name'],
            user['email']
        )
        
        if email_result['success']:
            sent_list.append({'email': recipient['email'], 'status': 'sent', 'documentId': new_doc_id})
        else:
            sent_list.append({'email': recipient['email'], 'status': 'failed'})
    
    return jsonify({'success': True, 'sent': sent_list})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    with open(USERS_FILE, 'r') as f:
        users_data = json.load(f)
        user = next((u for u in users_data['users'] if u['email'] == data['email'] and u['password'] == data['password']), None)
        if user:
            return jsonify({'token': user['token'], 'email': user['email']})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    with open(USERS_FILE, 'r') as f:
        users_data = json.load(f)
    
    if any(u['email'] == data['email'] for u in users_data['users']):
        return jsonify({'error': 'User exists'}), 400
    
    new_user = {'email': data['email'], 'password': data['password'], 'token': secrets.token_urlsafe(16)}
    users_data['users'].append(new_user)
    
    with open(USERS_FILE, 'w') as f:
        json.dump(users_data, f)
    
    return jsonify({'token': new_user['token'], 'email': new_user['email']})

@app.route('/api/documents', methods=['GET'])
def get_documents():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    docs = []
    for filename in os.listdir(DATA_FOLDER):
        if filename.endswith('.json') and filename not in ['users.json', 'signature_requests.json', 'email_log.json']:
            try:
                with open(os.path.join(DATA_FOLDER, filename), 'r') as f:
                    doc = json.load(f)
                    if doc.get('userId') == user['email']:
                        # Load signature requests for this document
                        with open(SIGNATURE_REQUESTS_FILE, 'r') as req_file:
                            req_data = json.load(req_file)
                            doc['signatureRequests'] = [r for r in req_data['requests'] if r['documentId'] == doc['id']]
                        docs.append(doc)
            except:
                pass
    return jsonify(docs)

@app.route('/api/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return jsonify(json.load(f))
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/documents', methods=['POST'])
def create_document():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    data['userId'] = user['email']
    doc_id = data['id']
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    with open(filepath, 'w') as f:
        json.dump(data, f)
    return jsonify(data)

@app.route('/api/documents/<doc_id>', methods=['PUT'])
def update_document(doc_id):
    data = request.json
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    with open(filepath, 'w') as f:
        json.dump(data, f)
    return jsonify(data)

@app.route('/api/documents/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    filepath = os.path.join(DATA_FOLDER, f'{doc_id}.json')
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            doc = json.load(f)
            if doc.get('userId') != user['email']:
                return jsonify({'error': 'Forbidden'}), 403
        os.remove(filepath)
    return jsonify({'success': True})

@app.route('/api/upload', methods=['POST'])
def upload_file():
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
    data = request.json
    pages = data.get('pages', [])
    doc_name = data.get('name', 'document')
    
    if not pages:
        return jsonify({'error': 'No pages'}), 400
    
    # Create PDF from base64 images
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer)
    
    for page in pages:
        # Decode base64 image
        img_data = page['imageUrl'].split(',')[1]
        img_bytes = base64.b64decode(img_data)
        img = Image.open(BytesIO(img_bytes))
        
        # Set page size based on image dimensions
        width, height = img.size
        c.setPageSize((width, height))
        
        # Save image to temp file for ReportLab
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            img.save(tmp, format='PNG')
            tmp_path = tmp.name
        
        # Draw image on PDF
        c.drawImage(tmp_path, 0, 0, width=width, height=height)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        c.showPage()
    
    c.save()
    pdf_buffer.seek(0)
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"{doc_name.replace('.pdf', '')}_signed.pdf"
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)
