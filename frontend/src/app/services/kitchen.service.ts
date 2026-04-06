import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';
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
export class KitchenService {
  constructor(
    private http: HttpClient,
  ) {}

  getMyKitchens(): Observable<Kitchen[]> {
    return this.http.get<Kitchen[]>(`${environment.apiUrl}/kitchens`);
  }

  switchCurrentKitchen(kitchenId: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/kitchens/${kitchenId}/switch`, {});
  }

  createKitchen(kitchenData: any): Observable<Kitchen> {
    return this.http.post<Kitchen>(`${environment.apiUrl}/kitchens`, kitchenData);
  }

  // SuperAdmin: Get ALL kitchens (paginated)
  getAllKitchens(page: number = 1, limit: number = 20, filters: {status?: string, plan?: string} = {}): Observable<{kitchens: Kitchen[], pagination: any}> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('status', filters.status || '')
      .set('plan', filters.plan || '');
    return this.http.get<{kitchens: Kitchen[], pagination: any}>(`${environment.apiUrl}/admin/kitchens`, { params });
  }

  // SuperAdmin: Toggle kitchen status (active/inactive)
  toggleKitchenStatus(id: string, status: 'active' | 'inactive' | 'maintenance'): Observable<Kitchen> {
    return this.http.patch<Kitchen>(`${environment.apiUrl}/admin/kitchens/${id}`, { status });
  }

  // SuperAdmin: Update kitchen details
  updateKitchen(id: string, data: Partial<Kitchen>): Observable<Kitchen> {
    return this.http.patch<Kitchen>(`${environment.apiUrl}/kitchens/${id}`, data);
  }

  // SuperAdmin: Soft delete kitchen (set inactive)
  deleteKitchen(id: string): Observable<Kitchen> {
    return this.http.patch<Kitchen>(`${environment.apiUrl}/admin/kitchens/${id}`, { status: 'inactive' });
  }
}

