"""SQLAlchemy ORM models for Document Signer"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    token = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="user")

    def to_dict(self):
        return {
            'email': self.email,
            'token': self.token
        }


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(255), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    pages = Column(JSON, nullable=False, default=list)
    fields = Column(JSON, nullable=False, default=list)
    recipients = Column(JSON, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="draft")  # draft, sent, completed
    is_template = Column(Boolean, default=False)
    template_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="documents")
    signature_requests = relationship("SignatureRequest", back_populates="document")

    __table_args__ = (
        Index('idx_user_id_status', 'user_id', 'status'),
    )

    def to_dict(self, include_requests=False):
        data = {
            'id': self.id,
            'userId': self.user.email if self.user else None,
            'name': self.name,
            'pages': self.pages,
            'fields': self.fields,
            'recipients': self.recipients,
            'status': self.status,
            'isTemplate': self.is_template,
            'templateId': self.template_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
        }
        if include_requests:
            data['signatureRequests'] = [r.to_dict() for r in self.signature_requests]
        return data


class SignatureRequest(Base):
    __tablename__ = "signature_requests"

    id = Column(String(255), primary_key=True, index=True)
    document_id = Column(String(255), ForeignKey("documents.id"), nullable=False, index=True)
    signer_email = Column(String(255), nullable=False, index=True)
    signer_name = Column(String(255), nullable=False)
    access_token = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, viewed, signed
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    signed_at = Column(DateTime, nullable=True)

    document = relationship("Document", back_populates="signature_requests")

    __table_args__ = (
        Index('idx_document_id_status', 'document_id', 'status'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'documentId': self.document_id,
            'signerEmail': self.signer_email,
            'signerName': self.signer_name,
            'status': self.status,
            'order': self.order,
            'accessToken': self.access_token,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'signedAt': self.signed_at.isoformat() if self.signed_at else None,
        }
