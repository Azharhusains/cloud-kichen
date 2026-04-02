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
  supportsHalf: boolean;
  fullPrice: number;
  halfPrice?: number;
  price?: number; // virtual backward compat
  costPrice: number;
  image: string | null;
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: {
    _id: string;
    name: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
  };
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
      formData.append('fullPrice', String(item.fullPrice || 0));
      
      // Only append halfPrice if supportsHalf=true AND halfPrice has valid value
      if (item.supportsHalf && item.halfPrice != null && item.halfPrice !== undefined && item.halfPrice > 0) {
        formData.append('halfPrice', String(item.halfPrice));
      }
      formData.append('supportsHalf', String(item.supportsHalf || false));
      formData.append('costPrice', String(item.costPrice || 0));
      formData.append('isAvailable', String(item.isAvailable !== false));
      return this.http.post<MenuItem>(`${environment.apiUrl}/menu`, formData);
    }
    
    // Fallback to regular JSON if no file
    const cleanItem = { ...item };
    if (!item.supportsHalf || item.halfPrice == null) {
      delete cleanItem.halfPrice; // Remove halfPrice if not needed
    }
    return this.http.post<MenuItem>(`${environment.apiUrl}/menu`, cleanItem);
  }

  updateMenuItem(id: string, item: Partial<MenuItem> & { imageFile?: File }): Observable<MenuItem> {
    if (item.imageFile) {
      const formData = new FormData();
      formData.append('image', item.imageFile);
      if (item.name) formData.append('name', item.name);
      if (item.category) formData.append('category', item.category);
      if (item.description) formData.append('description', item.description);
      if (item.fullPrice !== undefined) formData.append('fullPrice', String(item.fullPrice));
      
      // Only append halfPrice if supportsHalf=true AND halfPrice has valid value
      if (item.supportsHalf && item.halfPrice != null && item.halfPrice !== undefined && item.halfPrice > 0) {
        formData.append('halfPrice', String(item.halfPrice));
      }
      if (item.supportsHalf !== undefined) formData.append('supportsHalf', String(item.supportsHalf));
      if (item.costPrice !== undefined) formData.append('costPrice', String(item.costPrice));
      formData.append('isAvailable', String(item.isAvailable !== false));
      return this.http.put<MenuItem>(`${environment.apiUrl}/menu/${id}`, formData);
    }
    
    // Fallback to regular JSON - clean up halfPrice if not needed
    const cleanItem = { ...item };
    if (!item.supportsHalf || item.halfPrice == null) {
      delete cleanItem.halfPrice;
    }
    return this.http.put<MenuItem>(`${environment.apiUrl}/menu/${id}`, cleanItem);
  }

  deleteMenuItem(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/menu/${id}`);
  }
}
