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
  image: string | null;
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

  createMenuItem(item: Partial<MenuItem> & { imageFile?: File }): Observable<MenuItem> {
    // Check if item has an image file
    if (item.imageFile) {
      const formData = new FormData();
      formData.append('image', item.imageFile);
      formData.append('name', item.name || '');
      formData.append('category', item.category || '');
      formData.append('description', item.description || '');
      formData.append('price', String(item.price || 0));
      formData.append('costPrice', String(item.costPrice || 0));
      formData.append('isAvailable', String(item.isAvailable !== false));
      return this.http.post<MenuItem>(`${environment.apiUrl}/menu`, formData);
    }
    
    // Fallback to regular JSON if no file
    return this.http.post<MenuItem>(`${environment.apiUrl}/menu`, item);
  }

  updateMenuItem(id: string, item: Partial<MenuItem> & { imageFile?: File }): Observable<MenuItem> {
    if (item.imageFile) {
      const formData = new FormData();
      formData.append('image', item.imageFile);
      if (item.name) formData.append('name', item.name);
      if (item.category) formData.append('category', item.category);
      if (item.description) formData.append('description', item.description);
      if (item.price !== undefined) formData.append('price', String(item.price));
      if (item.costPrice !== undefined) formData.append('costPrice', String(item.costPrice));
      formData.append('isAvailable', String(item.isAvailable !== false));
      return this.http.put<MenuItem>(`${environment.apiUrl}/menu/${id}`, formData);
    }
    
    // Fallback to regular JSON
    return this.http.put<MenuItem>(`${environment.apiUrl}/menu/${id}`, item);
  }

  deleteMenuItem(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/menu/${id}`);
  }
}
