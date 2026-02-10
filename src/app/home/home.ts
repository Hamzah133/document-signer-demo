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
  // UI state
  isDesignerMode = true;
  showSignatureModal = false;
  currentSignatureField: Field | null = null;
  
  // Document data
  documentId: string | null = null;
  selectedRecipient: Recipient | null = null;
  
  // Unused legacy fields
  showSendModal = false;
  recipientEmail = '';
  emailSubject = '';
  newRecipientName = '';
  newRecipientEmail = '';

  constructor(
    public docService: DocumentService,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if editing existing document or creating new one
    this.documentId = this.route.snapshot.paramMap.get('id');
    
    if (this.documentId) {
      // Load existing document from backend
      this.apiService.getDocument(this.documentId).subscribe(doc => {
        this.docService.loadDocument(doc);
        // Show completed docs in preview mode
        if (doc.status === 'completed') {
          this.isDesignerMode = false;
        }
      });
    } else {
      // Create new document with default signer
      this.docService.createDocument('Untitled Document');
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Update document name
    const doc = this.docService.getDocument();
    if (doc) doc.name = file.name;
    
    // Convert PDF to images using PDF.js
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const pages = [];

    // Render each page as image
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
    this.apiService.uploadPdf(file).subscribe(() => this.saveDocument());
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
    // Ensure we have a recipient
    if (!this.selectedRecipient) {
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }
    
    // Add field at top-left corner
    this.docService.addField({
      type,
      pageNumber: 1,
      x: 5, y: 5,
      width: 150, height: 40,
      recipientId: this.selectedRecipient.id,
      required: true
    });
    this.saveDocument();
  }

  onDragEnd(event: CdkDragEnd, field: Field) {
    // Calculate new position as percentage
    const element = event.source.element.nativeElement;
    const parent = element.parentElement!.getBoundingClientRect();
    const box = element.getBoundingClientRect();

    const newX = (box.left - parent.left) / parent.width * 100;
    const newY = (box.top - parent.top) / parent.height * 100;

    this.docService.updateField(field.id, { x: newX, y: newY });
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

  toggleMode() {
    if (this.isCompleted && !this.isDesignerMode) {
      alert('This document has been signed and cannot be edited.');
      return;
    }
    this.isDesignerMode = !this.isDesignerMode;
  }

  saveDocument() {
    const doc = this.docService.getDocument();
    if (!doc) return;
    
    if (this.documentId) {
      // Update existing
      this.apiService.updateDocument(doc).subscribe();
    } else {
      // Create new
      this.apiService.saveDocument(doc).subscribe(saved => {
        this.documentId = saved.id;
        this.router.navigate(['/editor', saved.id], { replaceUrl: true });
      });
    }
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  openSendModal() {
    // Ensure recipient exists
    if (!this.document?.recipients.length) {
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }
    
    // Save if needed, then generate link
    if (!this.documentId) {
      this.apiService.saveDocument(this.docService.getDocument()!).subscribe(saved => {
        this.documentId = saved.id;
        this.router.navigate(['/editor', saved.id], { replaceUrl: true });
        this.generateShareLink();
      });
    } else {
      this.generateShareLink();
    }
  }

  generateShareLink() {
    const link = `http://localhost:4200/sign/${this.documentId}`;
    
    navigator.clipboard.writeText(link).then(
      () => alert(`Signing link copied!\n\n${link}`),
      () => alert(`Signing link:\n\n${link}`)
    );
    
    // Mark as sent
    const doc = this.docService.getDocument();
    if (doc) {
      doc.status = 'sent';
      this.saveDocument();
    }
  }

  downloadPdf() {
    if (!this.document?.pages.length) return;
    
    const link = document.createElement('a');
    link.href = this.document.pages[0].imageUrl;
    link.download = `${this.document.name.replace('.pdf', '')}_signed.png`;
    link.click();
  }

  // Helpers
  get isCompleted() { return this.document?.status === 'completed'; }
  get document() { return this.docService.getDocument(); }
  getRecipient(id: string) { return this.document?.recipients.find(r => r.id === id); }
}