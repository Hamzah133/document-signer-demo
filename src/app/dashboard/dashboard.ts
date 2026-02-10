import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
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

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Dashboard loading...');
    this.loadDocuments();
  }

  loadDocuments() {
    this.apiService.getDocuments().subscribe({
      next: (docs) => {
        console.log('Documents loaded:', docs);
        this.documents = docs;
      },
      error: (err) => {
        console.error('Failed to load documents', err);
        alert('Backend not running. Start Flask server: cd backend && python app.py');
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
}
