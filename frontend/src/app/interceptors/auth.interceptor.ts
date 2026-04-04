import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NetworkService } from '../services/network.service';
import { OfflineQueueService } from '../services/offline-queue.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private networkService: NetworkService,
    private queueService: OfflineQueueService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    const kitchenId = localStorage.getItem('currentKitchenId');
    
    let modifiedReq = req.clone();
    
    // Add auth headers and params (keep existing)
    if (token) {
      modifiedReq = modifiedReq.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    if (kitchenId && modifiedReq.urlWithParams.includes('/api/')) {
      modifiedReq = modifiedReq.clone({
        setParams: {
          kitchenId: kitchenId
        }
      });
    }
    
    // Offline check before sending - queue if needed
    if (!this.networkService.isOnline() && !this.isSafeMethod(req.method)) {
      const queueId = this.queueService.addToQueue(req.clone());
      // Optimistic UI: fake success response
      return of(new HttpResponse({ status: 202, statusText: 'Queued', body: { queued: true, queueId } }));
    }
    
    // Normal online flow with error handling
    return next.handle(modifiedReq).pipe(
      catchError(error => this.handleError(req.clone(), error))
    );
  }

  private isSafeMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method);
  }

  private handleError(originalReq: HttpRequest<any>, error: any): Observable<never> {
    // Network error: queue if mutable
    if (this.isNetworkError(error) && !this.isSafeMethod(originalReq.method)) {
      this.queueService.addToQueue(originalReq.clone());
      return of(new HttpResponse({ status: 202, statusText: 'Queued (retry)', body: { queued: true } })) as any;
    }
    
    // Re-throw other errors (server 4xx/5xx)
    throw error;
  }

  private isNetworkError(error: any): boolean {
    return !error.status ||
           error.status === 0 ||
           !this.networkService.isOnline() ||
           error.name === 'HttpErrorResponse' && error.message?.includes('network') ||
           error.message?.includes('Failed to fetch') ||
           error.message?.includes('timeout');
  }
}
