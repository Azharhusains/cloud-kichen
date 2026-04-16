import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        query('.animate-item', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ transform: 'scale(0.3)', opacity: 0 }),
        animate('0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ])
  ]
})
export class OrderConfirmationComponent implements OnInit {
  order: any = null;
  orderId: string = '';
  customOrderId: number = 0;
  orderDate: Date | null = null;
  estimatedDelivery: Date | null = null;
  deliveryAddress: any = {};
  orderItems: any[] = [];
  totalAmount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.loadOrder();
    }
  }

  loadOrder(): void {
    this.orderService.getOrder(this.orderId).subscribe({
      next: (order) => {
        console.log('Order data received:', order);
        this.order = order;
        this.orderDate = order.createdAt;
        this.estimatedDelivery = order.estimatedDelivery;
        this.deliveryAddress = order.deliveryAddress;
        
        // For dine-in orders with aggregated items, show all items
        if (order.aggregatedItems && order.aggregatedItems.length > 0) {
          this.orderItems = order.aggregatedItems;
          // Calculate total from aggregated subtotal
          this.totalAmount = order.aggregatedItems.reduce((sum: number, item: any) => 
            sum + (item.price * item.quantity), 0);
        } else {
          this.orderItems = order.items;
          this.totalAmount = order.totalAmount;
        }
        
        this.customOrderId = order.orderNumber;
      },
      error: (error) => {
        console.error('Error loading order:', error);
      }
    });
  }

  trackOrder(): void {
    // For dine-in orders with masterOrderId, track the main order
    if (this.order?.masterOrderId && this.order.orderType === 'dine-in') {
      // Find the first sub-order to use as main tracking link
      // First check localStorage for original order id
      const activeMasterOrderId = localStorage.getItem('activeMasterOrderId');
      if (activeMasterOrderId !== null) {
        this.router.navigate(['/order-tracking', activeMasterOrderId]);
        return;
      }
    }
    this.router.navigate(['/order-tracking', this.orderId]);
  }

  getItemDisplayPrice(item: any): number {
    // Use the stored price from order (backend sets correct price)
    return item.price || item.menuItem?.price || 0;
  }

  getPortionLabel(item: any): string {
    return item.quantityType === 'HALF' ? '(Half)' : '(Full)';
  }

  goHome(): void {
    this.router.navigate(['/menu']);
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
    return typeof taxRate === 'number' ? (taxRate * 100) : 18;
  }

  getTotalAmount(): number {
    if (!this.order) return 0;
    return typeof this.order.totalAmount === 'number' ? this.order.totalAmount : 0;
  }

  hasPriceBreakdown(): boolean {
    if (!this.order) return false;
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
