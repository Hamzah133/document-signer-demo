import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentState } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getDocuments(): Observable<DocumentState[]> {
    return this.http.get<DocumentState[]>(`${this.baseUrl}/documents`);
  }

  getDocument(id: string): Observable<DocumentState> {
    return this.http.get<DocumentState>(`${this.baseUrl}/documents/${id}`);
  }

  saveDocument(doc: DocumentState): Observable<DocumentState> {
    return this.http.post<DocumentState>(`${this.baseUrl}/documents`, doc);
  }

  updateDocument(doc: DocumentState): Observable<DocumentState> {
    return this.http.put<DocumentState>(`${this.baseUrl}/documents/${doc.id}`, doc);
  }

  uploadPdf(file: File): Observable<{filename: string, path: string}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{filename: string, path: string}>(`${this.baseUrl}/upload`, formData);
  }

  sendDocument(docId: string, email: string, subject: string): Observable<{token: string}> {
    return this.http.post<{token: string}>(`${this.baseUrl}/documents/${docId}/send`, { email, subject });
  }

  getDocumentByToken(token: string): Observable<DocumentState> {
    return this.http.get<DocumentState>(`${this.baseUrl}/sign/${token}`);
  }

  completeDocument(token: string, doc: DocumentState): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.baseUrl}/sign/${token}/complete`, doc);
  }
}
