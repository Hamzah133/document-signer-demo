import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DocumentState, Recipient, Field } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private documentState = new BehaviorSubject<DocumentState | null>(null);
  document$ = this.documentState.asObservable();

  private readonly COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  createDocument(name: string) {
    const doc: DocumentState = {
      id: this.generateId(),
      name,
      type: 'document',
      pages: [],
      fields: [],
      recipients: [],
      createdAt: new Date(),
      status: 'draft',
      isTemplate: false
    };
    this.documentState.next(doc);
    return doc;
  }

  addRecipient(name: string, email: string): Recipient {
    const doc = this.documentState.value;
    if (!doc) throw new Error('No document');

    const recipient: Recipient = {
      id: this.generateId(),
      name,
      email,
      color: this.COLORS[doc.recipients.length % this.COLORS.length],
      order: doc.recipients.length + 1
    };

    doc.recipients.push(recipient);
    this.documentState.next(doc);
    return recipient;
  }

  removeRecipient(id: string) {
    const doc = this.documentState.value;
    if (!doc) return;
    
    doc.recipients = doc.recipients.filter(r => r.id !== id);
    doc.fields = doc.fields.filter(f => f.recipientId !== id);
    this.documentState.next(doc);
  }

  addField(field: Omit<Field, 'id'>): Field {
    const doc = this.documentState.value;
    if (!doc) throw new Error('No document');
    
    const newField: Field = { ...field, id: this.generateId() };
    doc.fields.push(newField);
    this.documentState.next(doc);
    return newField;
  }

  updateField(id: string, updates: Partial<Field>) {
    const doc = this.documentState.value;
    if (!doc) return;
    
    const field = doc.fields.find(f => f.id === id);
    if (field) {
      Object.assign(field, updates);
      this.documentState.next(doc);
    }
  }

  removeField(id: string) {
    const doc = this.documentState.value;
    if (!doc) return;
    
    doc.fields = doc.fields.filter(f => f.id !== id);
    this.documentState.next(doc);
  }

  isComplete(): boolean {
    const doc = this.documentState.value;
    if (!doc) return false;
    
    return doc.fields
      .filter(f => f.required)
      .every(f => f.value && f.value.trim() !== '');
  }

  getDocument() {
    return this.documentState.value;
  }

  loadDocument(doc: DocumentState) {
    this.documentState.next(doc);
  }

  setPages(pages: any[]) {
    const doc = this.documentState.value;
    if (doc) {
      doc.pages = pages;
      this.documentState.next(doc);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
