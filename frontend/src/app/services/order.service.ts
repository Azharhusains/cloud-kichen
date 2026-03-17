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

  createPaymentSession(orderData: any, couponCode?: string): Observable<any> {
    const body = { 
      orderData,
      couponCode: couponCode || ''
    };
    return this.http.post(`${environment.apiUrl}/payment/create-session`, body);
  }

  getOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/orders`);
  }

  getOrder(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/orders/${id}`);
  }

  updateOrderStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/orders/${id}/status`, { status });
  }

  /**
   * Verify Razorpay payment and create order
   */
  verifyPayment(orderId: string, paymentId: string, signature: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/payment/verify`, { 
      razorpay_order_id: orderId, 
      razorpay_payment_id: paymentId, 
      razorpay_signature: signature 
    });
  }

  /**
   * Get formatted invoice data for an order
   */
  getInvoice(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/orders/${id}/invoice`);
  }

  /**
   * Cancel an order
   * @param id - Order ID
   * @param reason - Reason for cancellation
   */
  cancelOrder(id: string, reason: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/orders/${id}/cancel`, { reason });
  }
}
