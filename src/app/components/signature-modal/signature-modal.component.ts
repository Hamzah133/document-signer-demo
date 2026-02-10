import { Component, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>Draw Your Signature</h3>
        <canvas #canvas 
                width="500" 
                height="200"
                (mousedown)="startDrawing($event)"
                (mousemove)="draw($event)"
                (mouseup)="stopDrawing()"
                (mouseleave)="stopDrawing()"
                (touchstart)="startDrawing($event)"
                (touchmove)="draw($event)"
                (touchend)="stopDrawing()">
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
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    canvas {
      border: 2px solid #ddd;
      cursor: crosshair;
      display: block;
      margin: 16px 0;
      background: white;
    }
    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }
    button.primary {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
  `]
})
export class SignatureModalComponent {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() signatureSaved = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    const pos = this.getPosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
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

  private getPosition(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    if (event instanceof MouseEvent) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    } else {
      const touch = event.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
  }
}
