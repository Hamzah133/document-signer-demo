import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DocumentState, Recipient, DocumentType } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor(private http: HttpClient, private apiService: ApiService) {}

  /**
   * Send signing links to recipients via email
   */
  sendSigningLinks(docId: string, recipients: Recipient[], documentName: string, documentType: DocumentType, senderName: string = 'Document Signer'): Observable<any> {
    return this.http.post(`${this.apiService.baseUrl}/documents/${docId}/send-signing-links`, {
      recipients: recipients,
      documentName: documentName,
      documentType: documentType,
      senderName: senderName
    });
  }

  /**
   * Get email delivery status for a document
   */
  getEmailStatus(docId: string): Observable<any> {
    return this.http.get(`${this.apiService.baseUrl}/email-status/${docId}`);
  }

  /**
   * Generate email preview for standard signing document
   */
  generateSigningLinkEmailPreview(recipientName: string, signingLink: string, documentName: string, senderName: string = 'Document Signer'): string {
    return `
      Hi ${recipientName},

      ${senderName} has requested your signature on the document: ${documentName}

      Please click the link below to review and sign:
      ${signingLink}

      This link will expire in 30 days.

      Thank you!
    `;
  }

  /**
   * Generate email preview for template document
   */
  generateTemplateEmailPreview(recipientName: string, templateLink: string, documentName: string, senderName: string = 'Document Signer'): string {
    return `
      Hi ${recipientName},

      ${senderName} has shared a reusable template: ${documentName}

      You can send this template to multiple recipients for signing.
      ${templateLink}

      Thank you!
    `;
  }

  /**
   * Generate email preview for multi-sign document
   */
  generateMultiSignEmailPreview(recipientName: string, signingLink: string, documentName: string, currentSignerNum: number, totalSigners: number, senderName: string = 'Document Signer'): string {
    return `
      Hi ${recipientName},

      ${senderName} has requested your signature on: ${documentName}

      Current Status: ${currentSignerNum} of ${totalSigners} signers have completed

      Click your unique signing link:
      ${signingLink}

      This link will expire in 30 days.

      Thank you!
    `;
  }
}
