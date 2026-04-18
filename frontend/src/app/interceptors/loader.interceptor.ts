import { inject, Injectable } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

export const loaderInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): any => {
  const loaderService = inject(LoaderService);
  
  if (!req.url.includes('/health') && !req.url.includes('/auth/check-super-admin')) {
    loaderService.show();
  }

  // Clone request with no-cache headers for GET requests
  let noCacheReq = req;
  if (req.method === 'GET') {
    noCacheReq = req.clone({
      setHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  return next(noCacheReq).pipe(
    finalize(() => loaderService.hide())
  );
};

