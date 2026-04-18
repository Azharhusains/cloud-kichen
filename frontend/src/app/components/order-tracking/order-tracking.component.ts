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

  // Calculate effective order status from suborders
  get effectiveOrderStatus(): string {
    if (!this.order) return 'received';
    
    // If main order is cancelled or completed, use that
    if (this.order.orderStatus === 'cancelled' || this.order.orderStatus === 'completed') {
      return this.order.orderStatus;
    }
    
    // If no suborders, use main order status
    if (!this.order.subOrders || this.order.subOrders.length === 0) {
      return this.order.orderStatus;
    }

    // Get all non-cancelled suborders
    const activeSubOrders = this.order.subOrders.filter((sub: any) => !sub.isCancelled);
    
    if (activeSubOrders.length === 0) {
      return 'cancelled';
    }

    // Get the most advanced status from active suborders
    const statusPriority = ['received', 'preparing', 'ready', 'delivered', 'completed'];
    let maxStatusIndex = 0;
    
    for (const subOrder of activeSubOrders) {
      const index = statusPriority.indexOf(subOrder.status);
      if (index > maxStatusIndex) {
        maxStatusIndex = index;
      }
    }

    return statusPriority[maxStatusIndex];
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

    // Listen for new sub orders
    this.socketService.onSubOrderCreated().subscribe({
      next: (subOrder) => {
        console.log('OrderTrackingComponent: Received subOrderCreated:', subOrder);
        if (this.order && subOrder.mainOrderId === this.order._id) {
          this.loadOrder(this.orderId!);
          this.toastService.success('New items added to your order');
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Sub order socket error:', err)
    });

    // Listen for sub order cancellation
    this.socketService.onSubOrderCancelled().subscribe({
      next: (subOrder) => {
        console.log('OrderTrackingComponent: Received subOrderCancelled:', subOrder);
        if (this.order && subOrder.mainOrderId === this.order._id) {
          this.loadOrder(this.orderId!);
          this.toastService.warning('A sub order has been cancelled');
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Sub order cancel socket error:', err)
    });

    // Listen for main order completion
    this.socketService.onMainOrderCompleted().subscribe({
      next: (mainOrder) => {
        console.log('OrderTrackingComponent: Received mainOrderCompleted:', mainOrder);
        if (mainOrder._id === this.orderId || mainOrder._id === this.orderId?.toString()) {
          this.order = { ...mainOrder };
          this.cdr.detectChanges();
          this.toastService.success('Your order has been completed');
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Main order complete socket error:', err)
    });
  }

  loadOrder(orderId: string): void {
    this.orderService.getMainOrderWithSubOrders(orderId).subscribe({
      next: (order: any) => {
        this.order = order;
        console.log('OrderTrackingComponent: Loaded order with sub orders:', order);
      },
      error: (error: any) => {
        console.error('OrderTrackingComponent: Error loading order:', error);
        // Fallback to original endpoint for backward compatibility
        this.orderService.getOrder(orderId).subscribe({
          next: (order: any) => {
            this.order = order;
            console.log('OrderTrackingComponent: Loaded order (fallback):', order);
          }
        });
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
    if (this.effectiveOrderStatus !== 'received' && this.effectiveOrderStatus !== 'preparing') {
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
    const currentIndex = this.statusSteps.indexOf(this.effectiveOrderStatus);
    const stepIndex = this.statusSteps.indexOf(step);
    return stepIndex < currentIndex;
  }

  getCurrentStepIndex(): number {
    if (!this.order) return 0;
    return this.statusSteps.indexOf(this.effectiveOrderStatus);
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
    const currentIndex = this.statusSteps.indexOf(this.effectiveOrderStatus);
    return ((currentIndex + 1) / this.statusSteps.length) * 100;
  }

  getEstimatedTime(step: string): string {
    if (!this.order) return '';
    const currentIndex = this.statusSteps.indexOf(this.effectiveOrderStatus);
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

  getItemDisplayPrice(item: any): number {
    if (item.quantityType === 'HALF' && item.menuItem?.halfPrice) {
      return item.menuItem.halfPrice;
    }
    return item.menuItem?.fullPrice || item.menuItem?.price || item.price || 0;
  }

  getPortionLabel(item: any): string {
    return item.quantityType === 'HALF' ? '(Half)' : '';
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
    
    // If we have sub orders, sum all non-cancelled sub order subtotals
    if (this.order.subOrders && this.order.subOrders.length > 0) {
      return this.order.subOrders
        .filter((subOrder: any) => !subOrder.isCancelled)
        .reduce((sum: number, subOrder: any) => sum + (subOrder.subtotal || 0), 0);
    }
    
    // Fallback to legacy field
    return typeof this.order.subtotal === 'number' ? this.order.subtotal : 0;
  }

  getDeliveryCharge(): number {
    if (!this.order) return 0;
    return typeof this.order.deliveryCharge === 'number' ? this.order.deliveryCharge : 0;
  }

  getTaxAmount(): number {
    if (!this.order) return 0;
    
    // If we have sub orders, sum all non-cancelled sub order tax amounts
    if (this.order.subOrders && this.order.subOrders.length > 0) {
      return this.order.subOrders
        .filter((subOrder: any) => !subOrder.isCancelled)
        .reduce((sum: number, subOrder: any) => sum + (subOrder.taxAmount || 0), 0);
    }
    
    // Fallback to legacy field
    return typeof this.order.taxAmount === 'number' ? this.order.taxAmount : 0;
  }

  getTaxRate(): number {
    if (!this.order) return 0;
    const taxRate = this.order.taxRate;
    return typeof taxRate === 'number' ? (taxRate * 100) : 5; // Default to 5% if not set
  }

  getTotalAmount(): number {
    if (!this.order) return 0;
    
    // If we have sub orders, sum all non-cancelled sub order totals plus delivery charge
    if (this.order.subOrders && this.order.subOrders.length > 0) {
      const subOrdersTotal = this.order.subOrders
        .filter((subOrder: any) => !subOrder.isCancelled)
        .reduce((sum: number, subOrder: any) => sum + (subOrder.totalAmount || 0), 0);
      
      // For dine-in orders, delivery charge is already included in main order total
      if (this.order.orderType === 'dine-in') {
        return subOrdersTotal;
      }
      
      return subOrdersTotal + this.getDeliveryCharge();
    }
    
    // Fallback to legacy field
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

  /**
   * Check if "Add More" button should be shown
   */
  canAddMore(): boolean {
    if (!this.order) return false;
    return this.order.status !== 'completed' && this.order.orderType === 'dine-in';
  }

  /**
   * Add more items to order - navigate to menu to select items
   */
  addMoreItems(): void {
    if (!this.canAddMore()) return;
    
    // Navigate to menu page with table number and main order ID
    this.router.navigate(['/menu'], { 
      queryParams: { 
        tableNumber: this.order.tableNumber,
        mainOrderId: this.order._id,
        addMore: 'true'
      }
    });
  }

  /**
   * Cancel a specific sub order
   */
  cancelSubOrder(subOrder: any): void {
    if (!subOrder || subOrder.isCancelled) return;
    
    // Check if cancellation is allowed
    const cancellableStatuses = ['received', 'preparing'];
    if (!cancellableStatuses.includes(subOrder.status)) {
      this.toastService.error('Sub order cannot be cancelled at this stage');
      return;
    }

    const dialogRef = this.dialog.open(CancelOrderDialogComponent, {
      width: '450px',
      data: {
        orderNumber: this.order.orderNumber,
        title: 'Cancel Items',
        message: 'Are you sure you want to cancel these items? Please provide a reason.',
        userType: 'customer'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((reason: string | null) => {
      if (reason && reason.trim() !== '') {
        this.orderService.cancelSubOrder(subOrder._id, reason.trim()).subscribe({
          next: () => {
            this.loadOrder(this.orderId!);
            this.toastService.success('Items cancelled successfully');
          },
          error: (error: any) => {
            console.error('Error cancelling sub order:', error);
            this.toastService.error(error.error?.message || 'Error cancelling items');
          }
        });
      }
    });
  }

  /**
   * Get sub order status display text
   */
  getSubOrderStatusText(status: string): string {
    switch (status) {
      case 'received': return 'Received';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
}
