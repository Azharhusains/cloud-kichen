import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InventoryItem {
  _id?: string;
  itemName: string;
  quantity: number;
  unit: string;
  minStockLevel?: number;
  isActive?: boolean;
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
export class InventoryService {
  constructor(private http: HttpClient) {}

  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${environment.apiUrl}/inventory`);
  }

  updateInventory(inventoryData: InventoryItem[]): Observable<InventoryItem[]> {
    return this.http.put<InventoryItem[]>(`${environment.apiUrl}/inventory`, inventoryData);
  }

  deleteInventory(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/inventory/${id}`);
  }
}
