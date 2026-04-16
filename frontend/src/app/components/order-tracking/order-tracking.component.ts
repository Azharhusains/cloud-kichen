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
import { CartService } from '../../services/cart.service';

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
    private dialog: MatDialog,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    console.log('OrderTrackingComponent: ngOnInit called');
    
    // Use paramMap AND queryParamMap to detect refresh
    this.route.paramMap.subscribe(params => {
      this.orderId = params.get('id');
      console.log('OrderTrackingComponent: orderId from params =', this.orderId);
      
      const orderId = params.get('id');
      if (orderId !== null) {
        this.orderId = orderId;
        this.loadOrder(orderId);
        this.setupSocketListeners();
      }
    });
    
    // Also listen for query param changes to force refresh
    this.route.queryParamMap.subscribe(params => {
      if (params.get('refresh')) {
        const orderId = this.orderId;
        if (orderId !== null) {
          console.log('OrderTrackingComponent: Forced refresh via query param');
          this.loadOrder(orderId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Don't disconnect socket here as it's a singleton service
    // Just leave the order room
    console.log('OrderTrackingComponent: ngOnDestroy called, leaving order room');
  }

  setupSocketListeners(): void {
    const orderId = this.orderId;
    if (orderId === null) return;

    console.log('OrderTrackingComponent: Setting up socket listeners for order:', orderId);
    
    // Join specific order room for real-time status updates
    this.socketService.joinOrderRoom(orderId);
    
    // If this is a dine-in order, also join the master order user room
    if (this.order?.masterOrderId) {
      this.socketService.joinUserRoom(this.order.masterOrderId);
      console.log('OrderTrackingComponent: Joined master order room:', this.order.masterOrderId);
    } else {
      // After order loads, if it's a dine-in order, join master room
      setTimeout(() => {
        if (this.order?.masterOrderId) {
          this.socketService.joinUserRoom(this.order.masterOrderId);
          console.log('OrderTrackingComponent: Joined master order room after load:', this.order.masterOrderId);
        }
      }, 500);
    }

    // Listen for order status changes via room
    this.socketService.onOrderStatusChanged().subscribe({
      next: (updatedOrder) => {
        console.log('OrderTrackingComponent: Received orderStatusChanged:', updatedOrder);
        console.log('OrderTrackingComponent: Comparing IDs - received:', updatedOrder._id, 'current:', this.orderId);
        
        const currentOrderId = this.orderId;
        if (currentOrderId && (updatedOrder._id === currentOrderId || updatedOrder._id === currentOrderId.toString())) {
          this.order = { ...updatedOrder };
          this.cdr.detectChanges();
          
          // If order is marked as completed, clear table info
          if (updatedOrder.orderStatus === 'completed' && updatedOrder.orderType === 'dine-in') {
            this.cartService.clearTableInfo();
            localStorage.removeItem('activeMasterOrderId');
            console.log('OrderTrackingComponent: Table info cleared as order is completed');
          }
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Socket error:', err)
    });

    // Listen for broadcast (fallback)
    this.socketService.onOrderStatusBroadcast().subscribe({
      next: (updatedOrder) => {
        console.log('OrderTrackingComponent: Received orderStatusBroadcast:', updatedOrder);
        console.log('OrderTrackingComponent: Comparing IDs - received:', updatedOrder._id, 'current:', this.orderId);
        
        const currentOrderId = this.orderId;
        if (currentOrderId && (updatedOrder._id === currentOrderId || updatedOrder._id === currentOrderId.toString())) {
          this.order = { ...updatedOrder };
          this.cdr.detectChanges();
          
          // If order is marked as completed, clear table info
          if (updatedOrder.orderStatus === 'completed' && updatedOrder.orderType === 'dine-in') {
            this.cartService.clearTableInfo();
            localStorage.removeItem('activeMasterOrderId');
            console.log('OrderTrackingComponent: Table info cleared as order is completed');
          }
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Broadcast Socket error:', err)
    });

    // Listen for order cancellation
    this.socketService.onOrderCancelledBroadcast().subscribe({
      next: (cancelledOrder) => {
        console.log('OrderTrackingComponent: Received orderCancelledBroadcast:', cancelledOrder);
        
        const currentOrderId = this.orderId;
        if (currentOrderId && (cancelledOrder._id === currentOrderId || cancelledOrder._id === currentOrderId.toString())) {
          this.order = { ...cancelledOrder };
          this.cdr.detectChanges();
          this.toastService.warning(`Your order #${this.order.orderNumber} has been cancelled`);
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Cancellation Socket error:', err)
    });
    
    // Listen for new sub-order (items added to this table session)
    this.socketService.onNewSubOrder().subscribe({
      next: (subOrder) => {
        console.log('OrderTrackingComponent: Received new_sub_order:', subOrder);
        
        // Refresh the order when new items are added
        const currentOrderId = this.orderId;
        if (currentOrderId) {
          this.loadOrder(currentOrderId);
          this.toastService.success('New items added to your order!');
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Sub-order socket error:', err)
    });
    
    // Listen for master order updates (aggregated items)
    this.socketService.onMasterOrderUpdated().subscribe({
      next: (masterOrderUpdate) => {
        console.log('OrderTrackingComponent: Received master_order_updated:', masterOrderUpdate);
        
        // Refresh the order to show updated items
        if (this.orderId) {
          // Force reload with slight delay to ensure backend data is persisted
          setTimeout(() => {
            const orderId = this.orderId;
            if (orderId !== null) {
              this.loadOrder(orderId);
              this.cdr.detectChanges();
              this.toastService.success('Order updated with new items!');
            }
          }, 300);
        }
      },
      error: (err: any) => console.error('OrderTrackingComponent: Master order update socket error:', err)
    });
    
    // Listen for master order completion
    this.socketService.onMasterOrderCompleted().subscribe({
      next: (data) => {
        console.log('OrderTrackingComponent: Received master_order_completed:', data);
        
        // Clear table info when master order is completed
        this.cartService.clearTableInfo();
        localStorage.removeItem('activeMasterOrderId');
        this.toastService.info('Your table session has been completed');
      },
      error: (err) => console.error('OrderTrackingComponent: Master order completed socket error:', err)
    });
  }

  loadOrder(orderId: string | null): void {
    if (!orderId) return;
    
    // Check if this looks like a masterOrderId (69e0c... format vs 69e0c2... suborder)
    // First try regular order endpoint, if 404 try master order endpoint
    this.orderService.getOrder(orderId).subscribe({
      next: (order: any) => {
        this.order = order;
        console.log('OrderTrackingComponent: Loaded order:', order);
        
        // If order is already completed, clear table info
        if (order.orderStatus === 'completed' && order.orderType === 'dine-in') {
          this.cartService.clearTableInfo();
          localStorage.removeItem('activeMasterOrderId');
          console.log('OrderTrackingComponent: Table info cleared as order is already completed');
        }
        
        // If this is a dine-in order without aggregated items, try to load master order
        if (this.order.orderType === 'dine-in' && this.order.masterOrderId && !this.order.aggregatedItems) {
          // Auto-refresh to get aggregated items
          setTimeout(() => {
            this.orderService.getOrder(orderId).subscribe({
              next: (updatedOrder: any) => {
                this.order = updatedOrder;
                this.cdr.detectChanges();
                
                // Check again after refresh
                if (updatedOrder.orderStatus === 'completed' && updatedOrder.orderType === 'dine-in') {
                  this.cartService.clearTableInfo();
                }
              }
            });
          }, 100);
        }
      },
      error: (error: any) => {
        // If regular order not found, try master order endpoint
        if (error.status === 404) {
          console.log('Order not found, trying master order endpoint for:', orderId);
          this.orderService.getMasterOrder(orderId).subscribe({
            next: (masterOrder: any) => {
              // Convert master order format to regular order format
              this.order = {
                ...masterOrder,
                _id: masterOrder.masterOrder._id,
                orderNumber: masterOrder.subOrders[0]?.orderNumber || 0,
                orderStatus: masterOrder.subOrders[0]?.orderStatus || 'received',
                orderType: 'dine-in',
                tableNumber: masterOrder.tableId,
                aggregatedItems: masterOrder.aggregatedItems,
                subtotal: masterOrder.aggregatedSubtotal,
                taxAmount: masterOrder.aggregatedTaxAmount,
                totalAmount: masterOrder.aggregatedTotalAmount
              };
              console.log('OrderTrackingComponent: Loaded master order:', this.order);
              this.cdr.detectChanges();
            },
            error: (masterError: any) => {
              console.error('OrderTrackingComponent: Error loading master order:', masterError);
            }
          });
        } else {
          console.error('OrderTrackingComponent: Error loading order:', error);
        }
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

  /**
   * Check if user can add more items to this order
   * Only for dine-in orders that are still active (received, preparing, ready, delivered)
   */
  canAddMoreItems(): boolean {
    if (!this.order) return false;
    if (this.order.orderType !== 'dine-in') return false;
    
    // Allow adding items in all active statuses except cancelled and completed
    const allowedStatuses = ['received', 'preparing', 'ready', 'delivered'];
    return allowedStatuses.includes(this.order.orderStatus);
  }

  /**
   * Get items to display - for dine-in orders, show all aggregated items
   */
  getDisplayItems(): any[] {
    if (!this.order) return [];
    
    // If we have aggregated items (master order with sub-orders), use those
    if (this.order.aggregatedItems && this.order.aggregatedItems.length > 0) {
      return this.order.aggregatedItems;
    }
    
    // Otherwise show just this order's items
    return this.order.items;
  }

  /**
   * Navigate to menu to add more items to the current table session
   */
  addMoreItems(): void {
    if (!this.order || !this.order.tableNumber) {
      this.toastService.error('Cannot add items to this order');
      return;
    }
    
    // Store the current table number and master order id
    const tableInfo = {
      tableNumber: this.order.tableNumber,
      capacity: 0 // We don't need capacity for existing orders
    };
    
    // Set table info in cart service so checkout skips table selection
    this.cartService.setTableInfo(tableInfo);
    
    // Store the ACTUAL MASTER ORDER ID so we redirect back here after checkout
    if (this.order.masterOrderId !== null) {
      localStorage.setItem('activeMasterOrderId', this.order.masterOrderId);
    }
    
    // Navigate to menu page
    this.router.navigate(['/menu']);
    this.toastService.info('Select items to add to your current order');
  }

  // Helper methods for price breakdown
  getSubtotal(): number {
    if (!this.order) return 0;
    
    // For dine-in orders with aggregated items, calculate from all items
    if (this.order.aggregatedItems && this.order.aggregatedItems.length > 0) {
      return this.order.aggregatedItems.reduce((sum: number, item: any) => 
        sum + (this.getItemDisplayPrice(item) * item.quantity), 0);
    }
    
    return typeof this.order.subtotal === 'number' ? this.order.subtotal : 0;
  }

  getDeliveryCharge(): number {
    if (!this.order) return 0;
    return typeof this.order.deliveryCharge === 'number' ? this.order.deliveryCharge : 0;
  }

  getTaxAmount(): number {
    if (!this.order) return 0;
    
    // For dine-in orders with aggregated items, calculate 5% tax
    if (this.order.aggregatedItems && this.order.aggregatedItems.length > 0) {
      return this.getSubtotal() * 0.05;
    }
    
    return typeof this.order.taxAmount === 'number' ? this.order.taxAmount : 0;
  }

  getTaxRate(): number {
    if (!this.order) return 0;
    const taxRate = this.order.taxRate;
    return typeof taxRate === 'number' ? (taxRate * 100) : 5; // Default to 5% for dine-in
  }

  getTotalAmount(): number {
    if (!this.order) return 0;
    
    // For dine-in orders with aggregated items, sum from all items plus tax
    if (this.order.aggregatedItems && this.order.aggregatedItems.length > 0) {
      return this.getSubtotal() + this.getTaxAmount();
    }
    
    return typeof this.order.totalAmount === 'number' ? this.order.totalAmount : 0;
  }

  hasPriceBreakdown(): boolean {
    if (!this.order) return false;
    
    // Always show breakdown for dine-in orders with aggregated items
    if (this.order.aggregatedItems && this.order.aggregatedItems.length > 0) {
      return true;
    }
    
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
