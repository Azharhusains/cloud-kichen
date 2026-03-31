import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.userSubject.next(this.decodeToken(token));
      const user = this.userSubject.value;
      if (!user.role) {
        this.http.get(`${environment.apiUrl}/auth/profile`).subscribe({
          next: (profile: any) => {
            user.role = profile.role;
            user.name = profile.name;
            user.email = profile.email;
            this.userSubject.next(user);
          },
          error: () => {
            // ignore
          }
        });
      }
    }
  }

  checkSuperAdminExists(): Observable<{exists: boolean}> {
    return this.http.get<{exists: boolean}>(`${environment.apiUrl}/auth/check-super-admin`);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/login`, credentials);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
    this.router.navigate(['/home']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): any {
    return this.userSubject.value;
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.userSubject.next(this.decodeToken(token));
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUserRole(): string | null {
    const user = this.userSubject.value;
    return user ? user.role : null;
  }

  getProfile(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/profile`);
  }

  addAddress(address: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/addresses`, address);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, { token, password });
  }

  removeAddress(index: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/auth/addresses/${index}`);
  }

  private decodeToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (error) {
      return null;
    }
  }
}
