import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:5000/api';
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{token: string, email: string}> {
    return this.http.post<{token: string, email: string}>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', res.email);
        this.tokenSubject.next(res.token);
      }));
  }

  register(email: string, password: string): Observable<{token: string, email: string}> {
    return this.http.post<{token: string, email: string}>(`${this.baseUrl}/register`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', res.email);
        this.tokenSubject.next(res.token);
      }));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    this.tokenSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }
}
