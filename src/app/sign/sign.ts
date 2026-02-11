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
    this.apiService.getDocument(this.token).subscribe(doc => {
      this.document = doc;
    });
  }

  get completedFields(): number {
    if (!this.document) return 0;
    
    let count = 0;
    const signatureFilled = this.document.fields.some(f => f.type === 'SIGNATURE' && f.value);
    const initialsFilled = this.document.fields.some(f => f.type === 'INITIALS' && f.value);
    
    this.document.fields.forEach(f => {
      if (f.type === 'SIGNATURE' && signatureFilled) count++;
      else if (f.type === 'INITIALS' && initialsFilled) count++;
      else if (f.type !== 'SIGNATURE' && f.type !== 'INITIALS' && f.value) count++;
    });
    
    return count;
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
      const fieldType = this.currentField.type;
      this.currentField.value = dataUrl;
      
      this.document?.fields.forEach(f => {
        if (f.type === fieldType && !f.value) {
          f.value = dataUrl;
        }
      });
    }
    this.showSignatureModal = false;
  }

  async finish() {
    if (!this.document) return;
    
    await this.burnSignaturesIntoPages();
    
    this.document.status = 'completed';
    this.apiService.updateDocument(this.document).subscribe(() => {
      this.completed = true;
    });
  }

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
          
          let imagesLoaded = 0;
          const totalImages = pageFields.filter(f => 
            f.type === 'SIGNATURE' || f.type === 'INITIALS'
          ).length;
          
          pageFields.forEach(field => {
            const x = (field.x / 100) * canvas.width;
            const y = (field.y / 100) * canvas.height;
            const w = field.width * 2;
            const h = field.height * 2;
            
            if (field.type === 'SIGNATURE' || field.type === 'INITIALS') {
              const sigImg = new Image();
              sigImg.onload = () => {
                ctx.drawImage(sigImg, x, y, w, h);
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                  page.imageUrl = canvas.toDataURL();
                  resolve();
                }
              };
              sigImg.src = field.value!;
            } else {
              ctx.font = '24px Arial';
              ctx.fillStyle = '#000';
              ctx.fillText(field.value!, x, y + 30);
            }
          });
          
          if (totalImages === 0) {
            page.imageUrl = canvas.toDataURL();
            resolve();
          }
        };
        img.src = page.imageUrl;
      });
    });
    
    await Promise.all(promises);
  }

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
