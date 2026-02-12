import { Component, ElementRef, ViewChild, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>{{ fieldType === 'INITIALS' ? 'Add Your Initials' : 'Add Your Signature' }}</h3>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab"
            [class.active]="mode === 'draw'"
            (click)="mode = 'draw'">
            ✏️ Draw
          </button>
          <button
            class="tab"
            [class.active]="mode === 'upload'"
            (click)="mode = 'upload'">
            📤 Upload
          </button>
          <button
            class="tab"
            [class.active]="mode === 'type'"
            (click)="mode = 'type'">
            ✍️ Type
          </button>
        </div>

        <!-- Draw Mode -->
        <div *ngIf="mode === 'draw'" class="mode-content">
          <canvas #canvas
                  class="signature-canvas"
                  width="500"
                  height="200"
                  (mousedown)="startDrawing($event)"
                  (mousemove)="draw($event)"
                  (mouseup)="stopDrawing()"
                  (mouseleave)="stopDrawing()"
                  (touchstart)="startDrawing($event)"
                  (touchmove)="draw($event)"
                  (touchend)="stopDrawing()"
                  (pointerdown)="startDrawing($event)"
                  (pointermove)="draw($event)"
                  (pointerup)="stopDrawing()"
                  (pointerleave)="stopDrawing()">
          </canvas>
          <div class="modal-actions">
            <button (click)="clear()">Clear</button>
            <button (click)="close()">Cancel</button>
            <button (click)="save()" class="primary">Save Signature</button>
          </div>
        </div>

        <!-- Upload Mode -->
        <div *ngIf="mode === 'upload'" class="mode-content">
          <div class="upload-area">
            <label class="file-upload-label">
              <input
                type="file"
                class="file-input"
                accept="image/*"
                (change)="onFileSelected($event)">
              <div class="upload-placeholder">
                <div class="upload-icon">📸</div>
                <div class="upload-text">Click to upload or drag & drop</div>
                <div class="upload-hint">PNG, JPG, GIF up to 10MB</div>
              </div>
            </label>
            <div *ngIf="uploadedImage" class="preview">
              <img [src]="uploadedImage" alt="Uploaded signature" class="preview-image">
            </div>
          </div>
          <div class="modal-actions">
            <button (click)="clearUpload()">Clear</button>
            <button (click)="close()">Cancel</button>
            <button (click)="saveUpload()" class="primary" [disabled]="!uploadedImage">Save Signature</button>
          </div>
        </div>

        <!-- Type Mode -->
        <div *ngIf="mode === 'type'" class="mode-content">
          <div class="type-controls">
            <div class="form-group">
              <label>Text</label>
              <input
                type="text"
                [(ngModel)]="signatureText"
                placeholder="Type your signature"
                (input)="renderSignatureText()"
                class="text-input">
            </div>

            <div class="form-group">
              <label>Font</label>
              <select [(ngModel)]="selectedFont" (change)="renderSignatureText()" class="font-select">
                <option value="cursive1">Dancing Script</option>
                <option value="cursive2">Great Vibes</option>
                <option value="cursive3">Pacifico</option>
                <option value="cursive4">Allura</option>
                <option value="handwriting">Caveat</option>
                <option value="script">Homemade Apple</option>
              </select>
            </div>

            <div class="form-group">
              <label>Size</label>
              <input
                type="range"
                [(ngModel)]="fontSize"
                min="20"
                max="120"
                (change)="renderSignatureText()"
                class="size-slider">
              <span class="size-value">{{ fontSize }}px</span>
            </div>
          </div>

          <canvas #typeCanvas
                  class="signature-canvas type-preview"
                  width="500"
                  height="200">
          </canvas>

          <div class="modal-actions">
            <button (click)="close()">Cancel</button>
            <button (click)="saveTyped()" class="primary" [disabled]="!signatureText">Save Signature</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .modal-content {
      background: white;
      padding: 24px;
      max-width: 600px;
      z-index: 10001;
      position: relative;
      border-radius: 8px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-content h3 {
      margin: 0 0 16px 0;
      color: #333333;
      font-size: 16px;
      font-weight: 600;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 2px solid #E5E5E5;
    }

    .tab {
      padding: 10px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #999999;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
      margin-bottom: -2px;
    }

    .tab:hover {
      color: #1E90FF;
    }

    .tab.active {
      color: #1E90FF;
      border-bottom-color: #1E90FF;
    }

    .mode-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .signature-canvas {
      border: 1px solid #E5E5E5;
      cursor: crosshair;
      display: block;
      margin: 0;
      background: white;
      touch-action: none;
      border-radius: 4px;
    }

    .signature-canvas.type-preview {
      cursor: default;
    }

    /* Upload Area */
    .upload-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .file-upload-label {
      position: relative;
      cursor: pointer;
    }

    .file-input {
      display: none;
    }

    .upload-placeholder {
      border: 2px dashed #1E90FF;
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      background: #F0F8FF;
      transition: all 0.2s;
    }

    .file-upload-label:hover .upload-placeholder {
      border-color: #275082;
      background: #E6F2FF;
    }

    .upload-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .upload-text {
      color: #1E90FF;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .upload-hint {
      color: #999999;
      font-size: 12px;
    }

    .preview {
      border: 1px solid #E5E5E5;
      border-radius: 4px;
      padding: 12px;
      background: #F7F7F7;
    }

    .preview-image {
      max-width: 100%;
      max-height: 150px;
      display: block;
      margin: 0 auto;
    }

    /* Type Mode */
    .type-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: #333333;
      text-transform: uppercase;
    }

    .text-input,
    .font-select {
      padding: 8px 12px;
      border: 1px solid #E5E5E5;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Poppins', sans-serif;
    }

    .text-input:focus,
    .font-select:focus {
      outline: none;
      border-color: #1E90FF;
      box-shadow: 0 0 0 3px rgba(30, 144, 255, 0.1);
    }

    .size-slider {
      width: 100%;
      cursor: pointer;
    }

    .size-value {
      font-size: 12px;
      color: #999999;
      margin-left: 8px;
    }

    /* Actions */
    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    button {
      padding: 8px 16px;
      border: 1px solid #E5E5E5;
      background: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.2s;
      border-radius: 4px;
    }

    button:hover:not(:disabled) {
      background: #F7F7F7;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.primary {
      background: #1E90FF;
      color: white;
      border-color: #1E90FF;
    }

    button.primary:hover:not(:disabled) {
      background: #275082;
    }
  `]
})
export class SignatureModalComponent {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeCanvas') typeCanvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() signatureSaved = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Input() fieldType: 'SIGNATURE' | 'INITIALS' = 'SIGNATURE';

  mode: 'draw' | 'upload' | 'type' = 'draw';
  uploadedImage: string | null = null;
  signatureText: string = '';
  selectedFont: string = 'cursive1';
  fontSize: number = 60;

  private ctx!: CanvasRenderingContext2D;
  private typeCtx!: CanvasRenderingContext2D;
  private isDrawing = false;

  private fontMap = {
    cursive1: "80px 'Dancing Script', cursive",
    cursive2: "80px 'Great Vibes', cursive",
    cursive3: "80px 'Pacifico', cursive",
    cursive4: "80px 'Allura', cursive",
    handwriting: "80px 'Caveat', cursive",
    script: "80px 'Homemade Apple', cursive"
  };

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context from canvas');
      return;
    }
    this.ctx = ctx;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const typeCanvas = this.typeCanvasRef.nativeElement;
    const typeCtx = typeCanvas.getContext('2d');
    if (typeCtx) {
      this.typeCtx = typeCtx;
      this.typeCtx.fillStyle = '#FFFFFF';
      this.typeCtx.fillRect(0, 0, typeCanvas.width, typeCanvas.height);
      this.typeCtx.fillStyle = '#000000';
      this.typeCtx.textBaseline = 'middle';
    }
  }

  startDrawing(event: MouseEvent | TouchEvent | PointerEvent) {
    event.preventDefault();
    this.isDrawing = true;
    const pos = this.getPosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent | PointerEvent) {
    if (!this.isDrawing) return;
    event.preventDefault();
    const pos = this.getPosition(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearUpload() {
    this.uploadedImage = null;
  }

  renderSignatureText() {
    if (!this.typeCtx) return;

    const canvas = this.typeCanvasRef.nativeElement;
    this.typeCtx.fillStyle = '#FFFFFF';
    this.typeCtx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.signatureText) {
      this.typeCtx.fillStyle = '#000000';
      const fontFamily = this.getFontFamily(this.selectedFont);
      this.typeCtx.font = `${this.fontSize}px ${fontFamily}`;
      this.typeCtx.textAlign = 'center';
      this.typeCtx.fillText(this.signatureText, canvas.width / 2, canvas.height / 2);
    }
  }

  private getFontFamily(font: string): string {
    const families: { [key: string]: string } = {
      cursive1: "'Dancing Script', cursive",
      cursive2: "'Great Vibes', cursive",
      cursive3: "'Pacifico', cursive",
      cursive4: "'Allura', cursive",
      handwriting: "'Caveat', cursive",
      script: "'Homemade Apple', cursive"
    };
    return families[font] || families['cursive1'];
  }

  save() {
    const dataUrl = this.canvasRef.nativeElement.toDataURL();
    this.signatureSaved.emit(dataUrl);
  }

  saveUpload() {
    if (this.uploadedImage) {
      this.signatureSaved.emit(this.uploadedImage);
    }
  }

  saveTyped() {
    const dataUrl = this.typeCanvasRef.nativeElement.toDataURL();
    this.signatureSaved.emit(dataUrl);
  }

  close() {
    this.closed.emit();
  }

  private getPosition(event: MouseEvent | TouchEvent | PointerEvent): { x: number, y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    if (event instanceof MouseEvent) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    } else if (event instanceof PointerEvent) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    } else if (event instanceof TouchEvent) {
      const touch = event.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  }
}
