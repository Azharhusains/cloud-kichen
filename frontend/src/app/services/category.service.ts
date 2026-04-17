import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';
import { HttpCacheBusterService } from './http-cache-buster.service';

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

export interface CategoryUpdate {
  action: 'create' | 'update' | 'delete';
  data: Category | { _id: string };
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;
  
  // Reactive categories for real-time updates
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService,
    private cacheBuster: HttpCacheBusterService
  ) {
    // Listen for category updates
    this.socketService.onCategoryUpdated().subscribe((update: CategoryUpdate) => {
      console.log('CategoryService: Received update:', update);
      let currentCategories = this.categoriesSubject.value;
      
      if (update.action === 'create') {
        currentCategories = [update.data as Category, ...currentCategories];
      } else if (update.action === 'update') {
        const index = currentCategories.findIndex(c => c._id === (update.data as Category)._id);
        if (index > -1) {
          currentCategories[index] = update.data as Category;
        }
      } else if (update.action === 'delete') {
        currentCategories = currentCategories.filter(c => c._id !== (update.data as { _id: string })._id);
      }
      
      this.categoriesSubject.next(currentCategories);
    });
  }

  // Load categories and update reactive stream (call on component init)
  loadCategories(): void {
    this.getCategories().subscribe({
      next: (categories) => {
        this.categoriesSubject.next(categories);
        console.log('✅ CategoryService: Fresh categories loaded');
      }
    });
  }

  // Get all categories (admin only - requires auth)
  getCategories(): Observable<Category[]> {
    const url = this.cacheBuster.addCacheBuster(this.apiUrl);
    console.log('CategoryService: Fetching categories:', url);
    return this.http.get<Category[]>(url);
  }

  // Get active categories (public - no auth required)
  getActiveCategories(): Observable<Category[]> {
    const url = this.cacheBuster.addCacheBuster(`${this.apiUrl}/active`);
    return this.http.get<Category[]>(url);
  }

  // Get single category by ID
  getCategoryById(id: string): Observable<Category> {
    const url = this.cacheBuster.addCacheBuster(`${this.apiUrl}/${id}`);
    return this.http.get<Category>(url);
  }

  // Create new category (admin only) - optimistic update handled by socket
  createCategory(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category);
  }

  // Update category (admin only) - optimistic update handled by socket
  updateCategory(id: string, category: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category);
  }

  // Delete category (admin only) - optimistic update handled by socket
  deleteCategory(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Expose current categories snapshot
  getCurrentCategories(): Category[] {
    return this.categoriesSubject.value;
  }
}
