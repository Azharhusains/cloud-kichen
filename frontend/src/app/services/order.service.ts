import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';
import { NetworkService } from './network.service';

declare global {
  interface Window {
    idb: any;
  }
}

export interface Order {
  _id: string;
  orderNumber: number;
  orderStatus: string;
  orderType: string;
  tableNumber?: string;
  totalAmount: number;
  // ... other fields
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  // Reactive recent orders for admin dashboard
  private recentOrdersSubject = new BehaviorSubject<Order[]>([]);
  public recentOrders$ = this.recentOrdersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService,
    private networkService: NetworkService
  ) {
    // Listen for new orders (admin)
    this.socketService.onNewOrder().subscribe((order) => {
      console.log('OrderService: New order via socket:', order);
      const currentOrders = this.recentOrdersSubject.value;
      const updatedOrders = [order, ...currentOrders].slice(0, 10);
      this.recentOrdersSubject.next(updatedOrders);
    });

    // Listen for order updates
    this.socketService.onOrderUpdated().subscribe((order) => {
      console.log('OrderService: Order updated via socket:', order);
      const currentOrders = this.recentOrdersSubject.value;
      const index = currentOrders.findIndex(o => o._id === order._id);
      if (index > -1) {
        currentOrders[index] = { ...currentOrders[index], ...order };
        this.recentOrdersSubject.next([...currentOrders]);
      }
    });
  }

  // Load recent orders on init (admin dashboard)
  loadRecentOrders(): void {
    this.getOrders().subscribe({
      next: (orders) => {
        const recent = orders.slice(0, 10);
        this.recentOrdersSubject.next(recent);
      }
    });
  }

  createOrder(orderData: any): Observable<any> {
    if (!this.networkService.isOnline()) {
      throw new Error('Cannot place order while offline');
    }
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

  /**
   * Download PDF invoice for order (server-generated)
   * @param orderNumber - Order number as string (e.g. "16")
   * @returns Observable<Blob> for browser download
   */
  downloadInvoice(orderNumber: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/orders/${orderNumber}/invoice`, { 
      responseType: 'blob' 
    });
  }

  /**
   * NEW: Get aggregated MasterOrder for dine-in tracking (all suborders items)
   */
  getMasterOrder(masterId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/orders/master-orders/${masterId}`);
  }

  /**
   * NEW: Add more items to dine-in table session
   */
  addMoreItems(tableNumber: string, items: any[], masterOrderId?: string): Observable<any> {
    const body: any = { items };
    if (masterOrderId) {
      body.masterOrderId = masterOrderId;
    }
    return this.http.post(`${environment.apiUrl}/orders/master-orders/dinein/${tableNumber}/add-more`, body);
  }

  /**
   * NEW: Complete MasterOrder session (aggregate bill)
   */
  completeMasterOrder(masterId: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/orders/master-orders/${masterId}/complete`, {});
  }

  /**
   * Check if table has active MasterOrder
   */
  hasActiveMasterOrder(tableNumber: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/orders/master-orders/table/${tableNumber}/active`);
  }
}
