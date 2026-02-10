from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import secrets
from datetime import datetime
from werkzeug.utils import secure_filename
import base64

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type"]}})

UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'data'

for folder in [UPLOAD_FOLDER, DATA_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

@app.route('/api/documents', methods=['GET'])
def get_documents():
    docs = []
    for filename in os.listdir(DATA_FOLDER):
        if filename.endswith('.json') and not filename.startswith('token_'):
            try:
                with open(os.path.join(DATA_FOLDER, filename), 'r') as f:
                    docs.append(json.load(f))
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
    data = request.json
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

@app.route('/api/upload', methods=['POST'])
def upload_file():
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
