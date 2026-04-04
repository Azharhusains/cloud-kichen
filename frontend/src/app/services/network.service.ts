import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  constructor() {
    // Listen to browser online/offline events
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));

    // Periodic ping check (every 30s)
    timer(0, 30000).pipe(
      switchMap(() => this.ping()),
      catchError(() => of(false))
    ).subscribe(status => this.setOnlineStatus(status));
  }

  private setOnlineStatus(status: boolean): void {
    this.isOnlineSubject.next(status);
  }

  private ping(): Promise<boolean> {
    if (!navigator.onLine) return Promise.resolve(false);
    
    // Simple HEAD to API health endpoint (public)
    return fetch(`${environment.apiUrl.replace(/\/$/, '')}/health`, {
      method: 'HEAD',
      headers: { 'Cache-Control': 'no-cache' }
    }).then(() => true).catch(() => false);
  }

  isOnline(): boolean {
    return this.isOnlineSubject.value;
  }
}
