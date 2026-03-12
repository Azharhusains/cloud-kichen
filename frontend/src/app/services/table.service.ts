import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private apiUrl = `${environment.apiUrl}/tables`;

  constructor(private http: HttpClient) {}

  // Get all tables (admin only)
  getTables(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Get table by number (public - for QR code scanning)
  getTableByNumber(tableNumber: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${tableNumber}`);
  }

  // Create new table (admin only)
  createTable(tableData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, tableData);
  }

  // Update table (admin only)
  updateTable(id: string, tableData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, tableData);
  }

  // Delete table (admin only)
  deleteTable(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Update table status (admin only)
  updateTableStatus(tableNumber: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${tableNumber}/status`, { status });
  }
}

