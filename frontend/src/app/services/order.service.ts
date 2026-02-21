import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private http: HttpClient) {}

  createOrder(orderData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/orders`, orderData);
  }

  getOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/orders`);
  }

  getOrder(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/orders/${id}`);
  }

  getOrderByOrderId(orderId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/orders/by-order-id/${orderId}`);
  }

  updateOrderStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/orders/${id}/status`, { status });
  }
}
