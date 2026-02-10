import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { DocumentState, Field } from '../models/document.model';
import { SignatureModalComponent } from '../components/signature-modal/signature-modal.component';

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, SignatureModalComponent],
  templateUrl: './sign.html',
  styleUrl: './sign.css'
})
export class SignComponent implements OnInit {
  document: DocumentState | null = null;
  token: string = '';
  showSignatureModal = false;
  currentField: Field | null = null;
  completed = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.apiService.getDocument(this.token).subscribe({
      next: (doc) => {
        this.document = doc;
        console.log('Document loaded for signing:', doc);
      },
      error: (err) => {
        console.error('Error loading document:', err);
        alert('Failed to load document. Please check the link.');
      }
    });
  }

  get completedFields(): number {
    return this.document?.fields.filter(f => f.value).length || 0;
  }

  get totalFields(): number {
    return this.document?.fields.length || 0;
  }

  get canFinish(): boolean {
    return this.document?.fields.every(f => !f.required || f.value) || false;
  }

  openSignature(field: Field) {
    this.currentField = field;
    this.showSignatureModal = true;
  }

  onSignatureSaved(dataUrl: string) {
    if (this.currentField) {
      this.currentField.value = dataUrl;
    }
    this.showSignatureModal = false;
  }

  finish() {
    if (!this.document) return;
    
    console.log('=== DOCUMENT SIGNED ===');
    console.log('Document:', this.document.name);
    console.log('Fields:', this.document.fields);
    console.log('Completed data:', JSON.stringify(this.document.fields.map(f => ({
      type: f.type,
      value: f.value,
      recipientId: f.recipientId
    })), null, 2));
    
    // Update document status and save to backend
    this.document.status = 'completed';
    this.apiService.updateDocument(this.document).subscribe({
      next: () => {
        console.log('Document saved to backend');
        this.completed = true;
      },
      error: (err) => {
        console.error('Failed to save:', err);
        this.completed = true; // Still show success to user
      }
    });
  }

  downloadPdf() {
    if (!this.document) return;
    
    const doc = this.document;
    const link = document.createElement('a');
    
    if (doc.pages.length > 0) {
      link.href = doc.pages[0].imageUrl;
      link.download = `${doc.name.replace('.pdf', '')}_signed.png`;
      link.click();
    }
  }
}
