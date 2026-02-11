import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentService } from '../services/document.service';
import { ApiService } from '../services/api.service';
import { Field, Recipient, DocumentType } from '../models/document.model';
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
  showSendModal = false;
  showTemplateSendModal = false;
  showAddRecipientModal = false;
  newRecipient = { name: '', email: '' };
  currentSignatureField: Field | null = null;
  currentPageNumber = 1;
  documentId: string | null = null;
  selectedRecipient: Recipient | null = null;
  sendingInProgress = false;
  templateRecipients: {name: string, email: string}[] = [];
  resizingField: Field | null = null;
  resizeStartX = 0;
  resizeStartY = 0;
  resizeStartWidth = 0;
  resizeStartHeight = 0;

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
    }
  }

  selectRecipient(recipient: Recipient) {
    this.selectedRecipient = recipient;
  }

  addNewRecipient() {
    this.newRecipient = { name: '', email: '' };
    this.showAddRecipientModal = true;
  }

  closeAddRecipientModal() {
    this.showAddRecipientModal = false;
  }

  saveNewRecipient() {
    if (!this.newRecipient.name || !this.newRecipient.email) {
      alert('Please enter both name and email.');
      return;
    }

    this.selectedRecipient = this.docService.addRecipient(this.newRecipient.name, this.newRecipient.email);
    this.showAddRecipientModal = false;
    this.saveDocument();
  }

  removeRecipient(recipientId: string, event: Event) {
    event.stopPropagation();
    if (!confirm('Remove this recipient? All assigned fields will be unassigned.')) return;
    
    this.docService.removeRecipient(recipientId);
    if (this.selectedRecipient?.id === recipientId) {
      this.selectedRecipient = this.document?.recipients[0] || null;
    }
    this.saveDocument();
  }

  toggleTemplate() {
    const doc = this.docService.getDocument();
    if (!doc) return;
    
    doc.isTemplate = !doc.isTemplate;
    
    if (doc.isTemplate) {
      alert('Template mode enabled. Use the Send button to send this template to multiple recipients.');
    }
    
    this.saveDocument();
  }

  openTemplateSendModal() {
    this.templateRecipients = [{name: '', email: ''}];
    this.showTemplateSendModal = true;
  }

  closeTemplateSendModal() {
    this.showTemplateSendModal = false;
  }

  addTemplateRecipient() {
    this.templateRecipients.push({name: '', email: ''});
  }

  removeTemplateRecipient(index: number) {
    this.templateRecipients.splice(index, 1);
  }

  sendTemplateToRecipients() {
    if (!this.documentId || !this.document) return;
    
    const validRecipients = this.templateRecipients.filter(r => r.name && r.email);
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient with name and email.');
      return;
    }

    this.sendingInProgress = true;

    this.apiService.sendTemplateToRecipients(this.documentId, validRecipients).subscribe({
      next: (result) => {
        this.sendingInProgress = false;
        this.showTemplateSendModal = false;
        alert(`Template sent to ${validRecipients.length} recipient(s)!`);
      },
      error: (err) => {
        this.sendingInProgress = false;
        console.error('Error sending template', err);
        alert('Failed to send template. Please try again.');
      }
    });
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

  /**
   * Add field assigned to selected recipient
   */
  addField(type: 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS' | 'NUMBER') {
    if (!this.selectedRecipient) {
      this.selectedRecipient = this.docService.addRecipient('Recipient 1', 'recipient@example.com');
    }

    this.docService.addField({
      type,
      pageNumber: this.currentPageNumber,
      x: 10, y: 10,
      width: 150, height: 40,
      recipientId: this.selectedRecipient.id,
      required: true
    });
    this.saveDocument();
  }

  /**
   * Change recipient assignment for a field
   */
  assignFieldToRecipient(field: Field, recipientId: string) {
    const recipient = this.document?.recipients.find(r => r.id === recipientId);
    if (recipient) {
      this.docService.updateField(field.id, {
        recipientId: recipientId
      });
      this.saveDocument();
    }
  }

  onDragEnd(event: CdkDragEnd, field: Field, page: any) {
    if (!this.isDesignerMode) return;

    const dragElement = event.source.element.nativeElement;
    const pageContainer = dragElement.closest('.page-container');
    
    if (!pageContainer) return;

    const pageRect = pageContainer.getBoundingClientRect();
    const dragRect = dragElement.getBoundingClientRect();

    // Calculate position relative to page container
    const relativeX = dragRect.left - pageRect.left;
    const relativeY = dragRect.top - pageRect.top;

    // Convert to percentage
    const percentX = (relativeX / pageRect.width) * 100;
    const percentY = (relativeY / pageRect.height) * 100;

    this.docService.updateField(field.id, { 
      x: Math.max(0, Math.min(percentX, 100)), 
      y: Math.max(0, Math.min(percentY, 100)) 
    });
    
    event.source.reset();
    this.saveDocument();
  }

  startResize(event: MouseEvent | TouchEvent, field: Field, page: any) {
    event.preventDefault();
    event.stopPropagation();

    this.resizingField = field;
    this.resizeStartWidth = field.width;
    this.resizeStartHeight = field.height;

    if (event instanceof MouseEvent) {
      this.resizeStartX = event.clientX;
      this.resizeStartY = event.clientY;
    } else if (event instanceof TouchEvent) {
      this.resizeStartX = event.touches[0].clientX;
      this.resizeStartY = event.touches[0].clientY;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMouseMove(event: MouseEvent | TouchEvent) {
    if (!this.resizingField) return;

    let currentX = 0;
    let currentY = 0;

    if (event instanceof MouseEvent) {
      currentX = event.clientX;
      currentY = event.clientY;
    } else if (event instanceof TouchEvent) {
      currentX = event.touches[0].clientX;
      currentY = event.touches[0].clientY;
    }

    const deltaX = currentX - this.resizeStartX;
    const deltaY = currentY - this.resizeStartY;

    const newWidth = Math.max(80, this.resizeStartWidth + deltaX);
    const newHeight = Math.max(40, this.resizeStartHeight + deltaY);

    this.docService.updateField(this.resizingField.id, {
      width: newWidth,
      height: newHeight
    });
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onMouseUp() {
    if (this.resizingField) {
      this.resizingField = null;
      this.saveDocument();
    }
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

  /**
   * Open send modal for email sending
   */
  openSendModal() {
    if (!this.document?.recipients.length) {
      this.selectedRecipient = this.docService.addRecipient('Signer', 'signer@example.com');
    }

    if (!this.documentId) {
      this.apiService.saveDocument(this.docService.getDocument()!).subscribe(saved => {
        this.documentId = saved.id;
        this.router.navigate(['/editor', saved.id], { replaceUrl: true });
        this.showSendModal = true;
      });
    } else {
      this.showSendModal = true;
    }
  }

  /**
   * Send document to recipients via email
   */
  sendViaEmail() {
    if (!this.documentId || !this.document) return;

    this.sendingInProgress = true;

    this.apiService.sendForSignature(this.documentId, this.document.recipients).subscribe({
      next: (result) => {
        this.sendingInProgress = false;
        this.showSendModal = false;
        alert('Signing links sent to all recipients!');
        this.document!.status = 'sent';
        this.saveDocument();
      },
      error: (err) => {
        this.sendingInProgress = false;
        console.error('Error sending links', err);
        alert('Failed to send signing links. Please try again.');
      }
    });
  }

  /**
   * Close send modal
   */
  closeSendModal() {
    this.showSendModal = false;
  }

  /**
   * Copy signing link to clipboard (fallback)
   */
  copySigningLink() {
    if (!this.documentId) return;
    const link = `http://localhost:4200/sign/${this.documentId}`;
    navigator.clipboard.writeText(link).then(
      () => alert(`Link copied!\n\n${link}`),
      () => alert(`Link:\n\n${link}`)
    );
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

    let closestPage = 1;
    let minDistance = Infinity;

    pages.forEach((page: any, index: number) => {
      const rect = page.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = index + 1;
      }
    });

    this.currentPageNumber = closestPage;
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
