import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

export interface Table {
  _id: string;
  tableNumber: string;
  status: 'available' | 'occupied' | 'locked';
  capacity: number;
  location?: string;
  isActive: boolean;
  lockedBy?: string;
  lockExpiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private apiUrl = `${environment.apiUrl}/tables`;
  
  // Reactive tables for real-time updates
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  public tables$ = this.tablesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {
    // Listen for table status changes
    this.socketService.onTableStatusChanged().subscribe((table) => {
      console.log('TableService: Table status changed via socket:', table);
      const currentTables = this.tablesSubject.value;
      const index = currentTables.findIndex(t => t._id === table._id);
      if (index > -1) {
        currentTables[index] = { ...currentTables[index], ...table };
      } else {
        currentTables.push(table);
      }
      this.tablesSubject.next([...currentTables]);
    });

    // Also listen to broadcast for completeness
    this.socketService.onTableStatusBroadcast().subscribe((table) => {
      console.log('TableService: Table status broadcast:', table);
      const currentTables = this.tablesSubject.value;
      const index = currentTables.findIndex(t => t._id === table._id);
      if (index > -1) {
        currentTables[index] = { ...currentTables[index], ...table };
      }
      this.tablesSubject.next([...currentTables]);
    });
  }

  // Load tables on init
  loadTables(): void {
    this.getTables().subscribe({
      next: (tables) => {
        this.tablesSubject.next(tables);
      }
    });
  }

  // Get all tables (admin only)
  getTables(): Observable<Table[]> {
    return this.http.get<Table[]>(this.apiUrl);
  }

  // Get table by number (public - for QR code scanning)
  getTableByNumber(tableNumber: string): Observable<Table> {
    return this.http.get<Table>(`${this.apiUrl}/${tableNumber}`);
  }

  // Create new table (admin only) - socket will handle real-time
  createTable(tableData: any): Observable<Table> {
    return this.http.post<Table>(this.apiUrl, tableData);
  }

  // Update table (admin only) - socket handles real-time
  updateTable(id: string, tableData: any): Observable<Table> {
    return this.http.put<Table>(`${this.apiUrl}/${id}`, tableData);
  }

  // Delete table (admin only)
  deleteTable(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Update table status (admin only) - socket handles
  updateTableStatus(tableNumber: string, status: string): Observable<Table> {
    return this.http.put<Table>(`${this.apiUrl}/${tableNumber}/status`, { status });
  }

  // Lock table for 2 minutes (customer)
  lockTable(tableNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tableNumber}/lock`, {});
  }

  // Unlock table (customer)
  unlockTable(tableNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tableNumber}/unlock`, {});
  }

  // Get current tables snapshot
  getCurrentTables(): Table[] {
    return this.tablesSubject.value;
  }
}

