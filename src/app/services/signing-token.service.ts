import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { DocumentState, Field, Recipient } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class SigningTokenService {
  private currentToken: string | null = null;
  private signingProgress = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private apiService: ApiService) {}

  /**
   * Generate unique signing tokens for all recipients of a document
   */
  generateSigningTokens(docId: string, recipients: Recipient[]): Observable<any> {
    return this.http.post(`${this.apiService.baseUrl}/documents/${docId}/generate-signing-tokens`, {
      recipients: recipients
    });
  }

  /**
   * Get document by signing token
   */
  getDocumentByToken(token: string): Observable<DocumentState> {
    this.currentToken = token;
    return this.http.get<DocumentState>(`${this.apiService.baseUrl}/signing-tokens/${token}`);
  }

  /**
   * Get signing progress for a multi-sign document
   */
  getSigningProgress(docId: string): Observable<any> {
    return this.http.get(`${this.apiService.baseUrl}/documents/${docId}/signing-progress`);
  }

  /**
   * Subscribe to signing progress updates
   */
  onSigningProgress(): Observable<any> {
    return this.signingProgress.asObservable();
  }

  /**
   * Update signing progress
   */
  updateSigningProgress(progress: any): void {
    this.signingProgress.next(progress);
  }

  /**
   * Submit recipient signatures to the backend
   */
  submitRecipientSignatures(docId: string, token: string, fields: Field[], pages: any[]): Observable<any> {
    return this.http.post(`${this.apiService.baseUrl}/documents/${docId}/recipient-signature`, {
      token: token,
      fields: fields,
      pages: pages
    });
  }

  /**
   * Get current signing token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Clear current token
   */
  clearCurrentToken(): void {
    this.currentToken = null;
  }
}
