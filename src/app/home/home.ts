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
  showSignatureModal = false;
  currentSignatureField: Field | null = null;
  currentPageNumber = 1;
  documentId: string | null = null;
  selectedRecipient: Recipient | null = null;

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
        if (doc.status === 'sent' || doc.status === 'completed') {
          this.isDesignerMode = false;
        }
      });
    } else {
      this.docService.createDocument('Untitled Document');
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const doc = this.docService.getDocument();
    if (doc) doc.name = file.name;
    
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
    this.apiService.uploadPdf(file).subscribe(() => this.saveDocument());
  }

  addField(type: 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS' | 'NUMBER') {
    if (!this.selectedRecipient) {
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }
    
    this.docService.addField({
      type,
      pageNumber: this.currentPageNumber,
      x: 40, y: 40,
      width: 150, height: 40,
      recipientId: this.selectedRecipient.id,
      required: true
    });
    this.saveDocument();
  }

  onDragEnd(event: CdkDragEnd, field: Field) {
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
    if (this.document?.status === 'sent' || this.document?.status === 'completed') {
      alert('This document has been sent and cannot be edited.');
      return;
    }
    this.isDesignerMode = !this.isDesignerMode;
  }

  saveDocument() {
    const doc = this.docService.getDocument();
    if (!doc) return;
    
    if (this.documentId) {
      this.apiService.updateDocument(doc).subscribe();
    } else {
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
    if (!this.document?.recipients.length) {
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }
    
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
    
    const doc = this.docService.getDocument();
    if (doc) {
      doc.status = 'sent';
      this.saveDocument();
    }
  }

  downloadPdf() {
    if (!this.document?.pages.length) return;
    
    this.apiService.downloadPdf(this.document).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.document!.name.replace('.pdf', '')}_signed.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  onPageScroll(event: any) {
    const container = event.target;
    const pages = container.querySelectorAll('.page-container');
    
    pages.forEach((page: any, index: number) => {
      const rect = page.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      if (rect.top >= containerRect.top && rect.top < containerRect.top + containerRect.height / 2) {
        this.currentPageNumber = index + 1;
      }
    });
  }

  deleteDocument() {
    if (!this.documentId || !confirm('Delete this document?')) return;
    
    this.apiService.deleteDocument(this.documentId).subscribe(() => {
      this.router.navigate(['/dashboard']);
    });
  }

  get document() { return this.docService.getDocument(); }
  get isCompleted() { return this.document?.status === 'completed'; }
  getRecipient(id: string) { return this.document?.recipients.find(r => r.id === id); }
}