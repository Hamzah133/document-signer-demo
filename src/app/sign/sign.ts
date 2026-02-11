import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  signingToken: string = '';
  currentRecipient: any = null;
  showSignatureModal = false;
  currentField: Field | null = null;
  completed = false;
  isMultiSign = false;
  signingProgress: any = null;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    const accessToken = this.route.snapshot.paramMap.get('token')!;
    if (!accessToken) {
      console.error('No access token provided');
      return;
    }
    this.loadDocumentByToken(accessToken);
  }

  /**
   * Load document using access token
   */
  loadDocumentByToken(accessToken: string) {
    this.apiService.getDocumentByAccessToken(accessToken).subscribe({
      next: (doc) => {
        this.document = doc;
        this.signingToken = accessToken;
        this.currentRecipient = doc.currentSigner;
      },
      error: (err) => {
        console.error('Failed to load document', err);
        alert('Invalid or expired signing link');
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Get only fields assigned to current recipient
   */
  getVisibleFields(): Field[] {
    if (!this.document || !this.currentRecipient) return [];
    return this.document.filteredFields || [];
  }

  /**
   * Get completed fields count (only from visible fields)
   */
  get completedFields(): number {
    const visibleFields = this.getVisibleFields();
    return visibleFields.filter(f => {
      // For signature and initials, just check if value exists (it's a data URL)
      if (f.type === 'SIGNATURE' || f.type === 'INITIALS') {
        return !!f.value;
      }
      // For NUMBER, DATE, and TEXT fields, check if value is not empty/null/undefined
      if (f.type === 'NUMBER' || f.type === 'DATE') {
        return f.value !== null && f.value !== undefined && String(f.value).trim() !== '';
      }
      // For TEXT fields
      return f.value && String(f.value).trim() !== '';
    }).length;
  }

  /**
   * Get total fields to complete (only visible to this recipient)
   */
  get totalFields(): number {
    return this.getVisibleFields().length;
  }

  /**
   * Check if all required fields are completed
   */
  get canFinish(): boolean {
    const visibleFields = this.getVisibleFields();
    return visibleFields.every(f => !f.required || f.value) || false;
  }

  /**
   * Open signature modal for a field
   */
  openSignature(field: Field) {
    this.currentField = field;
    this.showSignatureModal = true;
  }

  /**
   * Handle signature saved from modal
   */
  onSignatureSaved(dataUrl: string) {
    if (!this.currentField || !this.document || !this.currentRecipient) return;

    const fieldType = this.currentField.type;
    const recipientId = this.currentRecipient.recipientId;

    // Update all fields of same type for this recipient in the main fields array
    this.document.fields.forEach(f => {
      if (f.type === fieldType && f.recipientId === recipientId) {
        f.value = dataUrl;
      }
    });

    // Update filteredFields (should reference the same objects as fields)
    if (this.document.filteredFields) {
      this.document.filteredFields.forEach(f => {
        if (f.type === fieldType) {
          f.value = dataUrl;
        }
      });
    }

    this.showSignatureModal = false;
  }

  /**
   * Finish signing and submit to backend
   */
  async finish() {
    if (!this.document || !this.currentRecipient) return;

    // Sync values from filteredFields back to fields before burning
    if (this.document.filteredFields) {
      this.document.filteredFields.forEach(filteredField => {
        const mainField = this.document!.fields.find(f => f.id === filteredField.id);
        if (mainField) {
          mainField.value = filteredField.value;
        }
      });
    }

    await this.burnSignaturesIntoPages();

    this.apiService.submitSignature(
      this.signingToken,
      this.document.fields,
      this.document.pages
    ).subscribe({
      next: (result) => {
        this.completed = true;
      },
      error: (err) => {
        console.error('Error submitting signatures', err);
        alert('Failed to submit signatures. Please try again.');
      }
    });
  }

  /**
   * Burn signatures into pages (canvas rendering)
   */
  async burnSignaturesIntoPages() {
    if (!this.document) return;

    const promises = this.document.pages.map(page => {
      return new Promise<void>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const pageFields = this.document!.fields.filter(
            f => f.pageNumber === page.pageNumber && f.value
          );

          const imageFields = pageFields.filter(f => f.type === 'SIGNATURE' || f.type === 'INITIALS');
          const totalImages = imageFields.length;

          // Render text fields first
          pageFields.forEach(field => {
            if (field.type !== 'SIGNATURE' && field.type !== 'INITIALS') {
              const x = (field.x / 100) * canvas.width;
              const y = (field.y / 100) * canvas.height;

              ctx.font = '28px Arial';
              ctx.fillStyle = '#000';
              ctx.textBaseline = 'top';
              const textValue = String(field.value || '');
              ctx.fillText(textValue, x + 5, y + 10);
            }
          });

          // Load all signature images in parallel
          if (totalImages === 0) {
            page.imageUrl = canvas.toDataURL();
            resolve();
          } else {
            const imagePromises = imageFields.map(field => {
              return new Promise<{ field: Field; img: HTMLImageElement }>((imgResolve) => {
                const sigImg = new Image();
                sigImg.onload = () => {
                  imgResolve({ field, img: sigImg });
                };
                sigImg.onerror = () => {
                  imgResolve({ field, img: sigImg });
                };
                sigImg.src = field.value!;
              });
            });

            Promise.all(imagePromises).then(loadedImages => {
              // Draw all loaded images
              loadedImages.forEach(({ field, img }) => {
                const x = (field.x / 100) * canvas.width;
                const y = (field.y / 100) * canvas.height;
                const w = field.width * 2;
                const h = field.height * 2;
                ctx.drawImage(img, x, y, w, h);
              });

              page.imageUrl = canvas.toDataURL();
              resolve();
            });
          }
        };
        img.src = page.imageUrl;
      });
    });

    await Promise.all(promises);
  }

  /**
   * Download signed PDF
   */
  downloadPdf() {
    if (!this.document) return;

    this.apiService.downloadPdf(this.document).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.document!.name.replace('.pdf', '')}_signed.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
