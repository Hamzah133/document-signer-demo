import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { DocumentState, DocumentType } from '../models/document.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  documents: DocumentState[] = [];
  userEmail: string = '';
  activeTab: 'documents' | 'templates' = 'documents';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userEmail = localStorage.getItem('email') || '';
    this.loadDocuments();
  }

  loadDocuments() {
    this.apiService.getDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
      },
      error: (err) => {
        console.error('Failed to load documents', err);
        this.documents = [];
      }
    });
  }

  /**
   * Get regular documents (not templates)
   */
  getDocuments(): DocumentState[] {
    return this.documents.filter(doc => !doc.isTemplate);
  }

  /**
   * Get template documents
   */
  getTemplates(): DocumentState[] {
    return this.documents.filter(doc => doc.isTemplate);
  }

  /**
   * Get filtered documents based on active tab
   */
  getFilteredDocuments(): DocumentState[] {
    switch (this.activeTab) {
      case 'documents':
        return this.getDocuments();
      case 'templates':
        return this.getTemplates();
      default:
        return [];
    }
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'documents' | 'templates') {
    this.activeTab = tab;
  }

  /**
   * Get signing progress text
   */
  getProgressText(doc: DocumentState): string {
    const requests = doc.signatureRequests || [];
    if (requests.length === 0) return 'No recipients';
    const signedCount = requests.filter(r => r.status === 'signed').length;
    return `${signedCount} of ${requests.length} signed`;
  }

  /**
   * Get progress percentage
   */
  getProgressPercent(doc: DocumentState): number {
    const requests = doc.signatureRequests || [];
    if (requests.length === 0) return 0;
    const signedCount = requests.filter(r => r.status === 'signed').length;
    return (signedCount / requests.length) * 100;
  }

  createNew() {
    this.router.navigate(['/editor']);
  }

  openDocument(doc: DocumentState) {
    this.router.navigate(['/editor', doc.id]);
  }

  deleteDocument(doc: DocumentState, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete "${doc.name}"?`)) return;

    this.apiService.deleteDocument(doc.id).subscribe(() => {
      this.loadDocuments();
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
