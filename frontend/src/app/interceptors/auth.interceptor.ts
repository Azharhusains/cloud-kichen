import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() {} intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {  
    const token = localStorage.getItem('token');
    const kitchenId = localStorage.getItem('currentKitchenId');
    
    let modifiedReq = req;
    
    if (token) {
      modifiedReq = modifiedReq.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    // Add kitchenId query parameter if available
    if (kitchenId && modifiedReq.url.includes('/api/')) {
      modifiedReq = modifiedReq.clone({
        setParams: {
          kitchenId: kitchenId
        }
      });
    }
    
    return next.handle(modifiedReq);
  }
}
