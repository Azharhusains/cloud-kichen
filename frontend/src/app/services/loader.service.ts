import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  private requestCount = 0;
  private debounceTimer: any;

  show(): void {
    this.requestCount++;
    this.debounceShow();
  }

  hide(): void {
    if (this.requestCount > 0) {
      this.requestCount--;
    }
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      clearTimeout(this.debounceTimer);
      this.loadingSubject.next(false);
    } else {
      this.debounceShow();
    }
  }

  private debounceShow(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (this.requestCount > 0) {
        this.loadingSubject.next(true);
      }
    }, 300); // 300ms debounce
  }

  getRequestCount(): number {
    return this.requestCount;
  }
}

