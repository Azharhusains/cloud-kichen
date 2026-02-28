import { Component, OnInit } from '@angular/core';
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

// Angular Animations
import { trigger, transition, style, animate } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';

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
    MatChipsModule
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
export class OrderTrackingComponent implements OnInit {
  order: any = null;
  statusSteps: string[] = ['received', 'preparing', 'ready', 'delivered'];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrder(orderId);
    }
  }

  loadOrder(orderId: string): void {
    this.orderService.getOrder(orderId).subscribe({
      next: (order: any) => {
        this.order = order;
      },
      error: (error: any) => {
        console.error('Error loading order:', error);
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
