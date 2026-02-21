import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor(private http: HttpClient) {}

  getInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/inventory`);
  }

  updateInventory(inventoryData: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/inventory`, inventoryData);
  }
}
