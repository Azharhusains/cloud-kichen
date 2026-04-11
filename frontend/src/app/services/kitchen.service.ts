import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

export interface KitchenStatus {
  status: 'open' | 'closed';
  isManual: boolean;
  manualBy: string | null;
  note: string;
  updatedAt: string;
}

export interface KitchenStatus {
  status: 'open' | 'closed';
  isManual: boolean;
  manualBy: string | null;
  note: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class KitchenService {
  private apiUrl = `${environment.apiUrl}/kitchen`;
  private statusSubject = new BehaviorSubject<KitchenStatus | null>(null);
  public status$ = this.statusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {
    // Listen for real-time status updates
    this.socketService.onKitchenStatusChanged().subscribe(status => {
      this.statusSubject.next(status);
    });
  }

  getStatus(): Observable<KitchenStatus> {
    return this.http.get<any>(`${this.apiUrl}/status`).pipe(
      map(data => ({
        status: data.status,
        isManual: data.isManual,
        manualBy: data.manualBy?.name || null,
        note: data.note || '',
        updatedAt: data.updatedAt
      })),
      tap(status => this.statusSubject.next(status))
    );
  }

  toggleStatus(status: 'open' | 'closed', note: string = ''): Observable<any> {
    return this.http.put(`${this.apiUrl}/status`, { status, note }).pipe(
      tap(() => {
        // Optimistic update
        this.statusSubject.next({ status, isManual: true, manualBy: null, note, updatedAt: new Date().toISOString() });
      })
    );
  }

  isOpen(): boolean {
    const current = this.statusSubject.value;
    return current?.status === 'open';
  }
}
