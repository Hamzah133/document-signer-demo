"""Migrate data from JSON files to SQLite database"""
import json
import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal, init_db, engine
from models import User, Document, SignatureRequest
import secrets

USERS_FILE = 'data/users.json'
SIGNATURE_REQUESTS_FILE = 'data/signature_requests.json'
DATA_FOLDER = 'data'

def get_utc_now():
    """Get current UTC time in ISO format"""
    return datetime.now(timezone.utc).isoformat()

def migrate():
    """Migrate all data from JSON to SQLite"""
    print("Initializing database...")
    init_db()

    db = SessionLocal()

    try:
        # Migrate users
        print("Migrating users...")
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                users_data = json.load(f)
                for user_data in users_data.get('users', []):
                    existing_user = db.query(User).filter(User.email == user_data['email']).first()
                    if not existing_user:
                        user = User(
                            email=user_data['email'],
                            password=user_data['password'],
                            token=user_data.get('token', secrets.token_urlsafe(16))
                        )
                        db.add(user)
                        print(f"  Added user: {user_data['email']}")

        db.commit()

        # Build user map for documents
        users_map = {user.email: user for user in db.query(User).all()}

        # Migrate documents
        print("Migrating documents...")
        for filename in os.listdir(DATA_FOLDER):
            if filename.endswith('.json') and filename not in ['users.json', 'signature_requests.json', 'email_log.json']:
                filepath = os.path.join(DATA_FOLDER, filename)
                try:
                    with open(filepath, 'r') as f:
                        doc_data = json.load(f)

                    # Skip if no ID
                    if 'id' not in doc_data:
                        print(f"  ⚠️  Skipping {filename} - no ID field")
                        continue

                    # Check if document already exists
                    existing_doc = db.query(Document).filter(Document.id == doc_data['id']).first()
                    if not existing_doc:
                        user_email = doc_data.get('userId')
                        user = users_map.get(user_email)

                        if user:
                            # Parse dates safely
                            created_at = None
                            updated_at = None
                            sent_at = None
                            completed_at = None

                            try:
                                if doc_data.get('createdAt'):
                                    created_at = datetime.fromisoformat(doc_data['createdAt'].replace('Z', '+00:00'))
                            except:
                                created_at = datetime.now(timezone.utc)

                            try:
                                if doc_data.get('updatedAt'):
                                    updated_at = datetime.fromisoformat(doc_data['updatedAt'].replace('Z', '+00:00'))
                            except:
                                updated_at = datetime.now(timezone.utc)

                            try:
                                if doc_data.get('sentAt'):
                                    sent_at = datetime.fromisoformat(doc_data['sentAt'].replace('Z', '+00:00'))
                            except:
                                pass

                            try:
                                if doc_data.get('completedAt'):
                                    completed_at = datetime.fromisoformat(doc_data['completedAt'].replace('Z', '+00:00'))
                            except:
                                pass

                            doc = Document(
                                id=doc_data['id'],
                                user_id=user.id,
                                name=doc_data.get('name', ''),
                                pages=doc_data.get('pages', []),
                                fields=doc_data.get('fields', []),
                                recipients=doc_data.get('recipients', []),
                                status=doc_data.get('status', 'draft'),
                                is_template=doc_data.get('isTemplate', False),
                                template_id=doc_data.get('templateId'),
                                created_at=created_at,
                                updated_at=updated_at,
                                sent_at=sent_at,
                                completed_at=completed_at,
                            )
                            db.add(doc)
                            print(f"  Added document: {doc_data['id']}")

                except json.JSONDecodeError:
                    print(f"  ⚠️  Skipping {filename} - invalid JSON")
                except Exception as e:
                    print(f"  ⚠️  Skipping {filename} - {e}")

        db.commit()

        # Migrate signature requests
        print("Migrating signature requests...")
        if os.path.exists(SIGNATURE_REQUESTS_FILE):
            with open(SIGNATURE_REQUESTS_FILE, 'r') as f:
                requests_data = json.load(f)
                for req_data in requests_data.get('requests', []):
                    doc_id = req_data.get('documentId')
                    doc = db.query(Document).filter(Document.id == doc_id).first()

                    if doc:
                        existing_req = db.query(SignatureRequest).filter(
                            SignatureRequest.access_token == req_data['accessToken']
                        ).first()

                        if not existing_req:
                            # Parse dates safely
                            created_at = None
                            signed_at = None

                            try:
                                if req_data.get('createdAt'):
                                    created_at = datetime.fromisoformat(req_data['createdAt'].replace('Z', '+00:00'))
                            except:
                                created_at = datetime.now(timezone.utc)

                            try:
                                if req_data.get('signedAt'):
                                    signed_at = datetime.fromisoformat(req_data['signedAt'].replace('Z', '+00:00'))
                            except:
                                pass

                            sig_req = SignatureRequest(
                                id=req_data['id'],
                                document_id=doc_id,
                                signer_email=req_data['signerEmail'],
                                signer_name=req_data['signerName'],
                                access_token=req_data['accessToken'],
                                status=req_data.get('status', 'pending'),
                                order=req_data.get('order', 1),
                                created_at=created_at,
                                signed_at=signed_at,
                            )
                            db.add(sig_req)
                            print(f"  Added signature request: {req_data['id']}")

        db.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == '__main__':
    migrate()

