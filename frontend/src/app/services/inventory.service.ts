import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

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
  private inventorySubject = new BehaviorSubject<InventoryItem[]>([]);
  public inventory$ = this.inventorySubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {
    // Listen for inventory updates
    this.socketService.onInventoryListUpdated().subscribe((inventoryList) => {
      console.log('InventoryService: Full inventory list updated via socket', inventoryList);
      this.inventorySubject.next(inventoryList);
    });

    // Note: Backend emits inventoryListUpdated which handles all cases
    // Individual item updates covered by full list refresh
  }

  loadInventory(): void {
    this.getInventory().subscribe({
      next: (inventory) => {
        this.inventorySubject.next(inventory);
      }
    });
  }

  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${environment.apiUrl}/inventory`, { 
      headers: { 'Cache-Control': 'no-cache' }
    });
  }

  updateInventory(inventoryData: InventoryItem[]): Observable<InventoryItem[]> {
    return this.http.put<InventoryItem[]>(`${environment.apiUrl}/inventory`, inventoryData);
  }

  deleteInventory(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/inventory/${id}`);
  }
}
