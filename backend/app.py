from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import json
import secrets
from datetime import datetime
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'data'
USERS_FILE = 'data/users.json'

for folder in [UPLOAD_FOLDER, DATA_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Simple user storage
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w') as f:
        json.dump({'users': [{'email': 'demo@example.com', 'password': 'demo123', 'token': 'demo-token'}]}, f)

def get_user_from_token(token):
    with open(USERS_FILE, 'r') as f:
        data = json.load(f)
        return next((u for u in data['users'] if u['token'] == token), None)

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
        if filename.endswith('.json') and not filename.startswith('token_') and filename != 'users.json':
            try:
                with open(os.path.join(DATA_FOLDER, filename), 'r') as f:
                    doc = json.load(f)
                    if doc.get('userId') == user['email']:
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
