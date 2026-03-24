import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
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
        this.loadProfile();
      }
    }
  }

  private loadProfile(): void {
    const token = this.getToken();
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    this.http.get(`${environment.apiUrl}/auth/profile`, { headers }).subscribe({
      next: (profile: any) => {
        const user = this.userSubject.value || {};
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

  // Role checks (normalize backend uppercase to lowercase for guards)
  normalizeRole(role: string): string {
    return role ? role.toLowerCase() : '';
  }

  isAdmin(): boolean {
    const role = this.normalizeRole(this.getUserRole() || '');
    return role === 'admin' || role === 'super_admin';
  }

  isSuperAdmin(): boolean {
    return this.normalizeRole(this.getUserRole() || '') === 'super_admin';
  }

  // For register form - returns boolean
  superAdminAvailable(): Observable<boolean> {
    return this.http.get<{ superAdminExists: boolean }>(`${environment.apiUrl}/auth/super-admin-available`)
      .pipe(map(res => res.superAdminExists));
  }

  getProfile(): Observable<any> {
    const token = this.getToken();
    if (!token) throw new Error('No token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get(`${environment.apiUrl}/auth/profile`, { headers });
  }

  addAddress(address: any): Observable<any> {
    const token = this.getToken();
    if (!token) throw new Error('No token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.post(`${environment.apiUrl}/auth/addresses`, address, { headers });
  }

  removeAddress(index: number): Observable<any> {
    const token = this.getToken();
    if (!token) throw new Error('No token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.delete(`${environment.apiUrl}/auth/addresses/${index}`, { headers });
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
