import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, distinctUntilChanged } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface HealthStatus {
  server: 'healthy' | 'unhealthy';
  database?: 'healthy' | 'unhealthy';
  kitchen: string;
  responseTime: number;
  recentOrders24h: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private healthSubject = new BehaviorSubject<HealthStatus | null>(null);
  public healthStatus$ = this.healthSubject.asObservable();

  private onlineStatusSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public onlineStatus$ = this.onlineStatusSubject.asObservable().pipe(
    distinctUntilChanged()
  );

  private readonly HEALTH_ENDPOINT = `${environment.apiUrl}/health`;

  constructor(private http: HttpClient, private ngZone: NgZone) {
    // Network status change events
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('online', () => {
        this.ngZone.run(() => this.onlineStatusSubject.next(true));
      });
      window.addEventListener('offline', () => {
        this.ngZone.run(() => this.onlineStatusSubject.next(false));
      });
    });

    // Periodic health checks
    interval(10000).pipe( // 10 seconds
      switchMap(() => this.checkHealth()),
      catchError(() => {
        this.healthSubject.next({ 
          server: 'unhealthy', 
          kitchen: 'closed', 
          responseTime: 999, 
          recentOrders24h: 0,
          timestamp: new Date().toISOString()
        });
        return [];
      })
    ).subscribe();
  }

  private checkHealth(): Observable<HealthStatus> {
    return this.http.get<any>(this.HEALTH_ENDPOINT).pipe(
      map(data => ({
        server: data.status || 'healthy',
        database: data.database || 'healthy',
        kitchen: data.kitchen?.status || data.kitchen || 'open',
        responseTime: data.responseTime || 0,
        recentOrders24h: data.recentOrders24h || 0,
        timestamp: data.timestamp || new Date().toISOString()
      }))
    );
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  getCurrentHealth(): HealthStatus | null {
    return this.healthSubject.value;
  }

  // Premium: Get connection quality (response time based)
  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    const health = this.getCurrentHealth();
    if (!this.isOnline()) return 'offline';
    if (!health) return 'poor';
    const rt = health.responseTime;
    if (rt < 200) return 'excellent';
    if (rt < 500) return 'good';
    return 'poor';
  }
}
