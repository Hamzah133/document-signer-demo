import { Component, ElementRef, ViewChild, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>{{ fieldType === 'INITIALS' ? 'Draw Your Initials' : 'Draw Your Signature' }}</h3>
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
    }
    .modal-content h3 {
      margin: 0 0 16px 0;
      color: #333333;
      font-size: 16px;
      font-family: 'Poppins', sans-serif;
    }
    .signature-canvas {
      border: 1px solid #E5E5E5;
      cursor: crosshair;
      display: block;
      margin: 16px 0;
      background: white;
      touch-action: none;
    }
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
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
      transition: background 0.2s;
    }
    button:hover {
      background: #F7F7F7;
    }
    button.primary {
      background: #1E90FF;
      color: white;
      border-color: #1E90FF;
    }
    button.primary:hover {
      background: #275082;
    }
  `]
})
export class SignatureModalComponent {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() signatureSaved = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Input() fieldType: 'SIGNATURE' | 'INITIALS' = 'SIGNATURE';

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

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

  save() {
    const dataUrl = this.canvasRef.nativeElement.toDataURL();
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
