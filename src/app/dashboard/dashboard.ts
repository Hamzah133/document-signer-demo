import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { DocumentState } from '../models/document.model';

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
