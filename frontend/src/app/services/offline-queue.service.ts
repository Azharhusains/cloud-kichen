import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { NetworkService } from './network.service';
import { ToastService } from './toast.service';

interface QueueItem {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: { [key: string]: string };
  params?: any;
  responseType?: 'json' | 'blob';
  timestamp: number;
  retryCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private queueSubject = new BehaviorSubject<QueueItem[]>([]);
  public queue$ = this.queueSubject.asObservable();
  private queueKey = 'offlineQueue';

  constructor(
    private http: HttpClient,
    private networkService: NetworkService,
    private toast: ToastService
  ) {
    // Auto-process if online on init
    if (this.networkService.isOnline()) {
      this.processQueue();
    }
    // Listen for online changes
    this.networkService.isOnline$.subscribe(online => {
      if (online && this.getQueueLength() > 0) {
        this.toast.info('Back online! Syncing queued actions...');
        this.processQueue();
      }
    });
  }

  addToQueue(request: HttpRequest<any>): string {
    const item: QueueItem = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      url: request.url!,
      method: request.method,
      body: request.body,
      headers: request.headers.keys().reduce((acc, key) => {
        acc[key] = request.headers!.get(key)!;
        return acc;
      }, {} as any),
      params: request.params ? Object.fromEntries(request.params.keys().map(k => [k, request.params.get(k)!])) : undefined,
      responseType: (request as any).responseType || 'json',
      timestamp: Date.now(),
      retryCount: 0
    };

    // Only queue non-idempotent requests (avoid duplicate GETs)
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return item.id; // No queue for reads
    }

    const queue = this.getQueue();
    queue.unshift(item); // Newest first
    this.saveQueue(queue);
    this.queueSubject.next(queue);

    this.toast.warning('No internet - Action queued for later.');
    return item.id;
  }

  private getQueue(): QueueItem[] {
    try {
      return JSON.parse(localStorage.getItem(this.queueKey) || '[]');
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueueItem[]): void {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
      this.queueSubject.next(queue);
    } catch (e) {
      console.error('Failed to save queue:', e);
    }
  }

  getQueueLength(): number {
    return this.getQueue().filter(item => !['GET', 'HEAD', 'OPTIONS'].includes(item.method)).length;
  }

  processQueue(): void {
    const queue = this.getQueue().filter(item => !['GET', 'HEAD', 'OPTIONS'].includes(item.method));
    if (queue.length === 0) return;

    queue.forEach(item => this.retryItem(item));
  }

  private async retryItem(item: QueueItem): Promise<void> {
    if (!this.networkService.isOnline()) return;

    const maxRetries = 4;
    const backoffMs = [1000, 2000, 5000, 10000][item.retryCount] || 10000;

    try {
      await new Promise(resolve => setTimeout(resolve, backoffMs));

      const headers = new HttpHeaders(item.headers);
      const obs = this.http.request(item.method as any, item.url, {
        body: item.body,
        headers,
        params: item.params,
        responseType: item.responseType as any,
        observe: 'response'
      });

      const response = await obs.toPromise();
      console.log(`Queued ${item.method} ${item.url} succeeded`);
      this.removeFromQueue(item.id);
    } catch (error: any) {
      console.warn(`Retry ${item.retryCount + 1} failed for ${item.id}:`, error);
      item.retryCount++;
      if (item.retryCount < maxRetries) {
        const queue = this.getQueue();
        const idx = queue.findIndex(q => q.id === item.id);
        if (idx > -1) {
          queue[idx] = item;
          this.saveQueue(queue);
          setTimeout(() => this.retryItem(item), backoffMs);
        }
      } else {
        this.removeFromQueue(item.id);
        this.toast.error(`Queued action failed permanently: ${item.method} ${item.url}`);
      }
    }
  }

  private removeFromQueue(id: string): void {
    const queue = this.getQueue().filter(item => item.id !== id);
    this.saveQueue(queue);
  }

  clearQueue(): void {
    localStorage.removeItem(this.queueKey);
    this.queueSubject.next([]);
  }
}
