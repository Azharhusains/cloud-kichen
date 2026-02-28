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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Angular Animations
import { trigger, transition, style, animate } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';
import { SocketService } from '../../services/socket.service';

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
    MatSnackBarModule
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
  statusSteps: string[] = ['received', 'preparing', 'ready', 'delivered'];
  private orderId: string | null = null;
  private socketConnected: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private socketService: SocketService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
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
          this.snackBar.open(`Order status updated to: ${updatedOrder.orderStatus}`, 'Close', { duration: 5000 });
        }
      },
      error: (err) => console.error('OrderTrackingComponent: Socket error:', err)
    });

    // Listen for broadcast (fallback)
    this.socketService.onOrderStatusBroadcast().subscribe({
      next: (updatedOrder) => {
        console.log('OrderTrackingComponent: Received orderStatusBroadcast:', updatedOrder);
        console.log('OrderTrackingComponent: Comparing IDs - received:', updatedOrder._id, 'current:', this.orderId);
        
        if (updatedOrder._id === this.orderId || updatedOrder._id === this.orderId?.toString()) {
          this.order = { ...updatedOrder };
          this.cdr.detectChanges();
          this.snackBar.open(`Order status updated to: ${updatedOrder.orderStatus}`, 'Close', { duration: 5000 });
        }
      },
      error: (err) => console.error('OrderTrackingComponent: Broadcast Socket error:', err)
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
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'received': return 'check_circle';
      case 'preparing': return 'restaurant';
      case 'ready': return 'takeout_dining';
      case 'delivered': return 'delivery_dining';
      default: return 'help';
    }
  }

  getStepIcon(step: string): string {
    switch (step) {
      case 'received': return 'check_circle';
      case 'preparing': return 'restaurant';
      case 'ready': return 'takeout_dining';
      case 'delivered': return 'home';
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
      default: return '';
    }
  }

  getStatusMessageIcon(status: string): string {
    switch (status) {
      case 'received': return 'shopping_cart';
      case 'preparing': return 'restaurant';
      case 'ready': return 'notifications_active';
      case 'delivered': return 'celebration';
      default: return 'info';
    }
  }

  getStatusMessage(status: string): string {
    switch (status) {
      case 'received': return 'Your order has been received and is being processed.';
      case 'preparing': return 'Our chefs are preparing your delicious food with care.';
      case 'ready': return 'Your order is ready and will be picked up by our delivery partner.';
      case 'delivered': return 'Your order has been delivered successfully. Enjoy your meal!';
      default: return 'Order status unknown.';
    }
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
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
