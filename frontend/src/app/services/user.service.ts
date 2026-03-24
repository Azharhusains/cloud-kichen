import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  getUsers(page: number = 1, limit: number = 10, search: string = '', role: string = ''): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) params = params.set('search', search);
    if (role && role !== 'all') params = params.set('role', role);

    return this.http.get<UsersResponse>(`${environment.apiUrl}/users`, { 
      headers: this.getHeaders(), 
      params 
    });
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/users/${userId}/role`, { role }, {
      headers: this.getHeaders()
    });
  }
}
