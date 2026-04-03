import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Category {
  _id?: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
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

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getKitchenId(): string | null {
    return this.authService.getCurrentKitchenId();
  }

  // Get all categories (admin only - requires auth + kitchenId)
  getCategories(): Observable<Category[]> {
    const kitchenId = this.getKitchenId();
    if (!kitchenId) {
      throw new Error('No kitchen selected. Please select a kitchen in profile.');
    }
    return this.http.post<Category[]>(this.apiUrl, { kitchenId });
  }

  // Get active categories (public - no auth required)
  getActiveCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/active`);
  }

  // Get single category by ID
  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  // Create new category (admin only - auto adds kitchenId)
  createCategory(category: Partial<Category>): Observable<Category> {
    const kitchenId = this.getKitchenId();
    if (!kitchenId) {
      throw new Error('No kitchen selected. Please select a kitchen first.');
    }
    const payload = { ...category, kitchenId };
    return this.http.post<Category>(this.apiUrl, payload);
  }

  // Update category (admin only - auto adds kitchenId)
  updateCategory(id: string, category: Partial<Category>): Observable<Category> {
    const kitchenId = this.getKitchenId();
    if (!kitchenId) {
      throw new Error('No kitchen selected. Please select a kitchen first.');
    }
    const payload = { ...category, kitchenId };
    return this.http.put<Category>(`${this.apiUrl}/${id}`, payload);
  }

  // Delete category (admin only)
  deleteCategory(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
