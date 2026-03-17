import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CancelOrderDialogComponent } from '../admin/confirm-dialog/cancel-order-dialog.component';
import { InvoiceComponent } from '../invoice/invoice.component';

// Angular Animations
import { trigger, transition, style, animate } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './order-tracking.component.html',
  styleUrls: ['./order-tracking.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  order: any = null;
  // For dine-in orders, 'completed' is added after 'delivered' to indicate customer finished eating
  deliveryStatusSteps: string[] = ['received', 'preparing', 'ready', 'delivered'];
  dineInStatusSteps: string[] = ['received', 'preparing', 'ready', 'delivered', 'completed'];
  private orderId: string | null = null;
  private socketConnected: boolean = false;

  // Get status steps based on order type
  get statusSteps(): string[] {
    if (!this.order) return this.deliveryStatusSteps;
    return this.order.orderType === 'dine-in' ? this.dineInStatusSteps : this.deliveryStatusSteps;
  }

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private socketService: SocketService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    console.log('OrderTrackingComponent: ngOnInit called');
    
    // Use paramMap observable to get the order ID
    this.route.paramMap.subscribe(params => {
      this.orderId = params.get('id');
      console.log('OrderTrackingComponent: orderId from params =', this.orderId);
      
      if (this.orderId) {
        this.loadOrder(this.orderId);
        this.setupSocketListeners();
      }
    });
  }

  ngOnDestroy(): void {
    // Don't disconnect socket here as it's a singleton service
    // Just leave the order room
    console.log('OrderTrackingComponent: ngOnDestroy called, leaving order room');
  }

  setupSocketListeners(): void {
    if (!this.orderId) return;

    console.log('OrderTrackingComponent: Setting up socket listeners for order:', this.orderId);
    
    // Join specific order room for real-time status updates
    this.socketService.joinOrderRoom(this.orderId);

    // Listen for order status changes via room
    this.socketService.onOrderStatusChanged().subscribe({
      next: (updatedOrder) => {
        console.log('OrderTrackingComponent: Received orderStatusChanged:', updatedOrder);
        console.log('OrderTrackingComponent: Comparing IDs - received:', updatedOrder._id, 'current:', this.orderId);
        
        if (updatedOrder._id === this.orderId || updatedOrder._id === this.orderId?.toString()) {
          this.order = { ...updatedOrder };
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Socket error:', err)
    });

    // Listen for broadcast (fallback)
    this.socketService.onOrderStatusBroadcast().subscribe({
      next: (updatedOrder) => {
        console.log('OrderTrackingComponent: Received orderStatusBroadcast:', updatedOrder);
        console.log('OrderTrackingComponent: Comparing IDs - received:', updatedOrder._id, 'current:', this.orderId);
        
        if (updatedOrder._id === this.orderId || updatedOrder._id === this.orderId?.toString()) {
          this.order = { ...updatedOrder };
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Broadcast Socket error:', err)
    });

    // Listen for order cancellation
    this.socketService.onOrderCancelledBroadcast().subscribe({
      next: (cancelledOrder) => {
        console.log('OrderTrackingComponent: Received orderCancelledBroadcast:', cancelledOrder);
        
        if (cancelledOrder._id === this.orderId || cancelledOrder._id === this.orderId?.toString()) {
          this.order = { ...cancelledOrder };
          this.cdr.detectChanges();
          this.toastService.warning(`Your order #${this.order.orderNumber} has been cancelled`);
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Cancellation Socket error:', err)
    });
  }

  loadOrder(orderId: string): void {
    this.orderService.getOrder(orderId).subscribe({
      next: (order: any) => {
        this.order = order;
        console.log('OrderTrackingComponent: Loaded order:', order);
      },
      error: (error: any) => {
        console.error('OrderTrackingComponent: Error loading order:', error);
      }
    });
  }

  /**
   * Cancel the order (user-side)
   * Only allowed when order status is 'received' or 'preparing'
   */
  cancelOrder(): void {
    if (!this.order) return;
    
    // Check if cancellation is allowed
    if (this.order.orderStatus !== 'received' && this.order.orderStatus !== 'preparing') {
      this.toastService.error('Order cannot be cancelled at this stage');
      return;
    }

    const dialogRef = this.dialog.open(CancelOrderDialogComponent, {
      width: '450px',
      data: {
        orderNumber: this.order.orderNumber,
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel your order? Please provide a reason.',
        userType: 'customer'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((reason: string | null) => {
      if (reason && reason.trim() !== '') {
        this.orderService.cancelOrder(this.order!._id, reason.trim()).subscribe({
          next: (updatedOrder) => {
            this.order = { ...updatedOrder };
            this.toastService.success('Order cancelled successfully');
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            console.error('Error cancelling order:', error);
            this.toastService.error(error.error?.message || 'Error cancelling order');
          }
        });
      }
    });
  }

  isStepCompleted(step: string): boolean {
    if (!this.order) return false;
    const currentIndex = this.statusSteps.indexOf(this.order.orderStatus);
    const stepIndex = this.statusSteps.indexOf(step);
    return stepIndex < currentIndex;
  }

  getCurrentStepIndex(): number {
    if (!this.order) return 0;
    return this.statusSteps.indexOf(this.order.orderStatus);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'received': return 'status-received';
      case 'preparing': return 'status-preparing';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'received': return 'check_circle';
      case 'preparing': return 'restaurant';
      case 'ready': return 'takeout_dining';
      case 'delivered': return 'delivery_dining';
      case 'completed': return 'event_available';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getStepIcon(step: string): string {
    switch (step) {
      case 'received': return 'check_circle';
      case 'preparing': return 'restaurant';
      case 'ready': return 'takeout_dining';
      case 'delivered': return 'home';
      case 'completed': return 'event_available';
      default: return 'circle';
    }
  }

  getProgressPercentage(): number {
    if (!this.order) return 0;
    const currentIndex = this.statusSteps.indexOf(this.order.orderStatus);
    return ((currentIndex + 1) / this.statusSteps.length) * 100;
  }

  getEstimatedTime(step: string): string {
    if (!this.order) return '';
    const currentIndex = this.statusSteps.indexOf(this.order.orderStatus);
    const stepIndex = this.statusSteps.indexOf(step);
    
    if (stepIndex <= currentIndex) {
      return 'Completed';
    }
    
    switch (step) {
      case 'preparing': return '~15-20 mins';
      case 'ready': return '~25-30 mins';
      case 'delivered': return '~35-45 mins';
      case 'completed': return '~25-30 mins';
      default: return '';
    }
  }

  getStatusMessageIcon(status: string): string {
    switch (status) {
      case 'received': return 'shopping_cart';
      case 'preparing': return 'restaurant';
      case 'ready': return 'notifications_active';
      case 'delivered': return 'celebration';
      case 'completed': return 'event_available';
      case 'cancelled': return 'cancel';
      default: return 'info';
    }
  }

  getStatusMessage(status: string): string {
    switch (status) {
      case 'received': return 'Your order has been received and is being processed.';
      case 'preparing': return 'Our chefs are preparing your delicious food with care.';
      case 'ready': return 'Your order is ready and will be picked up by our delivery partner.';
      case 'delivered': return 'Your order has been delivered successfully. Enjoy your meal!';
      case 'completed': return 'Thank you for dining with us! We hope you enjoyed your meal.';
      case 'cancelled': 
        if (this.order?.refundStatus === 'succeeded') {
          return `Order cancelled - Full refund processed (₹${this.order.refundAmount?.toFixed(2)}). Check your payment method.`;
        } else if (this.order?.refundStatus === 'manual_pending') {
          return `Order cancelled - Cash refund will be processed manually. Contact support.`;
        } else if (this.order?.refundStatus === 'failed') {
          return `Order cancelled (${this.order.refundNotes || 'reason'}). Contact support for refund.`;
        }
        console.log('order', this.order)
        return 'Your order has been cancelled.';
      default: return 'Order status unknown.';
    }
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  /**
   * Check if invoice is available (order is completed or delivered)
   */
  canShowInvoice(): boolean {
    if (!this.order) return false;
    return ['delivered', 'completed'].includes(this.order.orderStatus);
  }

  /**
   * Open invoice dialog
   */
  openInvoice(): void {
    if (!this.order?._id || !this.canShowInvoice()) {
      this.toastService.warning('Invoice available only for completed orders');
      return;
    }

    const dialogRef = this.dialog.open(InvoiceComponent, {
      width: '60vw',
      maxWidth: '600px',
      maxHeight: '95vh',
      data: { orderId: this.order._id },
      panelClass: 'invoice-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Invoice dialog closed:', result);
    });
  }

  // Helper methods for price breakdown
  getSubtotal(): number {
    if (!this.order) return 0;
    return typeof this.order.subtotal === 'number' ? this.order.subtotal : 0;
  }

  getDeliveryCharge(): number {
    if (!this.order) return 0;
    return typeof this.order.deliveryCharge === 'number' ? this.order.deliveryCharge : 0;
  }

  getTaxAmount(): number {
    if (!this.order) return 0;
    return typeof this.order.taxAmount === 'number' ? this.order.taxAmount : 0;
  }

  getTaxRate(): number {
    if (!this.order) return 0;
    const taxRate = this.order.taxRate;
    return typeof taxRate === 'number' ? (taxRate * 100) : 18; // Default to 18% if not set
  }

  getTotalAmount(): number {
    if (!this.order) return 0;
    return typeof this.order.totalAmount === 'number' ? this.order.totalAmount : 0;
  }

  hasPriceBreakdown(): boolean {
    if (!this.order) return false;
    // Check if price-related properties exist and are valid numbers
    const subtotal = this.order.subtotal;
    const deliveryCharge = this.order.deliveryCharge;
    const taxAmount = this.order.taxAmount;
    const totalAmount = this.order.totalAmount;
    
    return (
      typeof subtotal === 'number' && 
      typeof deliveryCharge === 'number' && 
      typeof taxAmount === 'number' &&
      typeof totalAmount === 'number' &&
      subtotal > 0
    );
  }
}
