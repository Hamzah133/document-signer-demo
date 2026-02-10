import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentService } from '../services/document.service';
import { ApiService } from '../services/api.service';
import { Field, Recipient } from '../models/document.model';
import { SignatureModalComponent } from '../components/signature-modal/signature-modal.component';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, SignatureModalComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  isDesignerMode = true;
  selectedRecipient: Recipient | null = null;
  showSignatureModal = false;
  currentSignatureField: Field | null = null;
  showSendModal = false;
  recipientEmail = '';
  emailSubject = '';
  
  newRecipientName = '';
  newRecipientEmail = '';
  documentId: string | null = null;

  constructor(
    public docService: DocumentService,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.documentId = this.route.snapshot.paramMap.get('id');
    if (this.documentId) {
      this.apiService.getDocument(this.documentId).subscribe(doc => {
        this.docService.loadDocument(doc);
        // If document is completed, switch to preview mode
        if (doc.status === 'completed') {
          this.isDesignerMode = false;
        }
      });
    } else {
      // Create empty document with default recipient
      this.docService.createDocument('Untitled Document');
      const defaultRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
      this.selectedRecipient = defaultRecipient;
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const doc = this.docService.getDocument();
    if (doc) {
      doc.name = file.name;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); 
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport, transform: null } as any).promise;

      pages.push({
        pageNumber: i,
        imageUrl: canvas.toDataURL(),
        width: viewport.width,
        height: viewport.height
      });
    }
    
    this.docService.setPages(pages);
    
    // Upload PDF to backend
    this.apiService.uploadPdf(file).subscribe(() => {
      this.saveDocument();
    });
  }

  addRecipient() {
    if (!this.newRecipientName.trim() || !this.newRecipientEmail.trim()) return;
    const recipient = this.docService.addRecipient(this.newRecipientName, this.newRecipientEmail);
    this.selectedRecipient = recipient;
    this.newRecipientName = '';
    this.newRecipientEmail = '';
    this.saveDocument();
  }

  addField(type: 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS') {
    // Auto-create recipient if none exists
    if (!this.selectedRecipient) {
      const defaultRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
      this.selectedRecipient = defaultRecipient;
    }
    
    this.docService.addField({
      type,
      pageNumber: 1,
      x: 5,
      y: 5,
      width: 150,
      height: 40,
      recipientId: this.selectedRecipient.id,
      required: true
    });
    this.saveDocument();
  }

  onDragEnd(event: CdkDragEnd, field: Field) {
    const element = event.source.element.nativeElement;
    const parent = element.parentElement!.getBoundingClientRect();
    const box = element.getBoundingClientRect();

    const newX = box.left - parent.left;
    const newY = box.top - parent.top;

    this.docService.updateField(field.id, {
      x: (newX / parent.width) * 100,
      y: (newY / parent.height) * 100
    });
    
    // Reset the drag transform
    event.source.reset();
    this.saveDocument();
  }

  openSignatureModal(field: Field) {
    this.currentSignatureField = field;
    this.showSignatureModal = true;
  }

  onSignatureSaved(dataUrl: string) {
    if (this.currentSignatureField) {
      this.docService.updateField(this.currentSignatureField.id, { value: dataUrl });
      this.saveDocument();
    }
    this.showSignatureModal = false;
    this.currentSignatureField = null;
  }

  getRecipient(id: string): Recipient | undefined {
    return this.docService.getDocument()?.recipients.find(r => r.id === id);
  }

  toggleMode() {
    // Don't allow editing completed documents
    if (this.document?.status === 'completed' && !this.isDesignerMode) {
      alert('This document has been signed and cannot be edited.');
      return;
    }
    this.isDesignerMode = !this.isDesignerMode;
  }

  saveDocument() {
    const doc = this.docService.getDocument();
    if (!doc) return;
    
    console.log('Saving document:', doc);
    
    if (this.documentId) {
      this.apiService.updateDocument(doc).subscribe({
        next: () => console.log('Document updated'),
        error: (err) => console.error('Update error:', err)
      });
    } else {
      this.apiService.saveDocument(doc).subscribe({
        next: (saved) => {
          console.log('Document saved:', saved);
          this.documentId = saved.id;
          this.router.navigate(['/editor', saved.id], { replaceUrl: true });
        },
        error: (err) => console.error('Save error:', err)
      });
    }
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  openSendModal() {
    // Auto-create recipient if none exists
    if (!this.document?.recipients.length) {
      const defaultRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
      this.selectedRecipient = defaultRecipient;
    }
    
    // Save first if not saved
    if (!this.documentId) {
      const doc = this.docService.getDocument();
      if (!doc) return;
      
      this.apiService.saveDocument(doc).subscribe({
        next: (saved) => {
          this.documentId = saved.id;
          this.router.navigate(['/editor', saved.id], { replaceUrl: true });
          this.generateShareLink();
        },
        error: (err) => {
          console.error('Save error:', err);
          alert('Failed to save document. Make sure backend is running.');
        }
      });
    } else {
      this.generateShareLink();
    }
  }

  generateShareLink() {
    if (!this.documentId) return;
    
    const signingLink = `http://localhost:4200/sign/${this.documentId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(signingLink).then(() => {
      alert(`Signing link copied to clipboard!\n\n${signingLink}`);
    }).catch(() => {
      alert(`Signing link created!\n\n${signingLink}\n\nCopy this link to sign the document.`);
    });
    
    const doc = this.docService.getDocument();
    if (doc) {
      doc.status = 'sent';
      this.saveDocument();
    }
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

  get isCompleted(): boolean {
    return this.document?.status === 'completed';
  }

  get document() {
    return this.docService.getDocument();
  }
}