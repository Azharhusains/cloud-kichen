import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpCacheBusterService {
  /**
   * Adds cache-busting timestamp to URL
   * Prevents browser/service worker caching
   */
  addCacheBuster(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
  }

  /**
   * Force refresh version - includes random nonce
   */
  forceRefresh(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}&_n=${Math.random().toString(36).substr(2, 9)}`;
  }
}

