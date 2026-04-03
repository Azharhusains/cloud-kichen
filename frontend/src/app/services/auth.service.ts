import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';


export interface Kitchen {
  _id: string;
  name: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  locations: any[];
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private kitchenKey = 'currentKitchenId';
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

constructor(private http: HttpClient, private router: Router) {
    this.loadUserAndKitchen();
  }

  private loadUserAndKitchen(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.userSubject.next(this.decodeToken(token));
      const user = this.userSubject.value;
      if (!user.role) {
        this.http.get(`${environment.apiUrl}/auth/profile?populateLoyalty=true`).subscribe({
          next: (profile: any) => {
            const updatedUser = { ...user, ...profile };
            this.userSubject.next(updatedUser);
            // Load owned kitchens and set default if needed
            this.loadOwnedKitchens();
          },
          error: () => {
            // ignore
          }
        });
      } else {
        this.loadOwnedKitchens();
      }
    }
  }

  getOwnedKitchens(): Observable<Kitchen[]> {
    return this.http.get<Kitchen[]>(`${environment.apiUrl}/kitchens`); }

  loadOwnedKitchens(): void {
    this.getOwnedKitchens().subscribe({
      next: (kitchens: Kitchen[]) => {
        const user = this.userSubject.value;
        if (kitchens.length > 0) {
          user.ownedKitchens = kitchens.map(k => k._id);
          // Set first kitchen as default if no current kitchen
          if (!user.currentKitchen && kitchens.length > 0) {
            this.setCurrentKitchenId(kitchens[0]._id);
            user.currentKitchen = kitchens[0]._id;
          }
          this.userSubject.next(user);
        }
      },
      error: (err) => console.error('Failed to load kitchens:', err)
    });
  }

  getCurrentKitchenId(): string | null {
    return localStorage.getItem(this.kitchenKey) || this.userSubject.value?.currentKitchen || null;
  }

  setCurrentKitchenId(kitchenId: string): void {
    localStorage.setItem(this.kitchenKey, kitchenId);
    const user = this.userSubject.value;
    if (user) {
      user.currentKitchen = kitchenId;
      this.userSubject.next(user);
    }
    // Call backend switch endpoint
    this.http.patch(`${environment.apiUrl}/kitchens/${kitchenId}/switch`, {}).subscribe({      error: (err) => console.error('Failed to switch kitchen:', err) });  }

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
    localStorage.removeItem(this.kitchenKey);
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
    return this.http.get(`${environment.apiUrl}/auth/profile?populateLoyalty=true`);
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
