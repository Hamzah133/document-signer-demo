import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentState } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getDocuments(): Observable<DocumentState[]> {
    return this.http.get<DocumentState[]>(`${this.baseUrl}/documents`, { headers: this.getHeaders() });
  }

  getDocument(id: string): Observable<DocumentState> {
    return this.http.get<DocumentState>(`${this.baseUrl}/documents/${id}`);
  }

  saveDocument(doc: DocumentState): Observable<DocumentState> {
    return this.http.post<DocumentState>(`${this.baseUrl}/documents`, doc, { headers: this.getHeaders() });
  }

  updateDocument(doc: DocumentState): Observable<DocumentState> {
    return this.http.put<DocumentState>(`${this.baseUrl}/documents/${doc.id}`, doc);
  }

  deleteDocument(id: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.baseUrl}/documents/${id}`, { headers: this.getHeaders() });
  }

  uploadPdf(file: File): Observable<{filename: string, path: string}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{filename: string, path: string}>(`${this.baseUrl}/upload`, formData, { headers: this.getHeaders() });
  }

  downloadPdf(doc: DocumentState): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/documents/${doc.id}/download`,
      { pages: doc.pages, name: doc.name },
      { responseType: 'blob' }
    );
  }

  // ============ NEW METHODS FOR MULTI-PARTY ROUTING ============

  /**
   * Send document for signature to external signers
   */
  sendForSignature(docId: string, recipients: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/documents/${docId}/send-for-signature`, {
      recipients: recipients
    }, { headers: this.getHeaders() });
  }

  /**
   * Get document by access token (for signing page)
   */
  getDocumentByAccessToken(accessToken: string): Observable<DocumentState> {
    return this.http.get<DocumentState>(`${this.baseUrl}/sign/${accessToken}`);
  }

  /**
   * Submit signature using access token
   */
  submitSignature(accessToken: string, fields: any[], pages: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/sign/${accessToken}/submit`, {
      fields: fields,
      pages: pages
    });
  }

  /**
   * Send template to multiple recipients
   */
  sendTemplateToRecipients(templateId: string, recipients: {name: string, email: string}[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/templates/${templateId}/send`, {
      recipients: recipients
    }, { headers: this.getHeaders() });
  }

  // ============ END NEW METHODS ============
}
