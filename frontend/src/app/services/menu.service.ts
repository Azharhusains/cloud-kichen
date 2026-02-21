import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category } from './category.service';

export interface MenuItem {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  costPrice: number;
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MenuResponse {
  menuItems: MenuItem[];
  categories: Category[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  constructor(private http: HttpClient) {}

  getMenuItems(): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${environment.apiUrl}/menu`);
  }

  getMenuItem(id: string): Observable<MenuItem> {
    return this.http.get<MenuItem>(`${environment.apiUrl}/menu/${id}`);
  }

  createMenuItem(item: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${environment.apiUrl}/menu`, item);
  }

  updateMenuItem(id: string, item: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${environment.apiUrl}/menu/${id}`, item);
  }

  deleteMenuItem(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/menu/${id}`);
  }
}
