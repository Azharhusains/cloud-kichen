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
    const orderIdNum = parseInt(this.orderId, 10);
    if (!isNaN(orderIdNum)) {
      this.orderService.getOrderByOrderId(orderIdNum).subscribe({
        next: (order) => {
          console.log('Order data received:', order);
          this.order = order;
          this.customOrderId = order.order_id || order.orderId || 0;
          this.orderDate = order.createdAt;
          this.estimatedDelivery = order.estimatedDelivery;
          this.deliveryAddress = order.deliveryAddress;
          this.orderItems = order.items;
          this.totalAmount = order.totalAmount;
          console.log('Custom Order ID set to:', this.customOrderId);
        },
        error: (error) => {
          console.error('Error loading order:', error);
        }
      });
    } else {
      // Fallback to MongoDB _id lookup for backwards compatibility
      this.orderService.getOrder(this.orderId).subscribe({
        next: (order) => {
          console.log('Order data received:', order);
          this.order = order;
          this.customOrderId = order.order_id || order.orderId || 0;
          this.orderDate = order.createdAt;
          this.estimatedDelivery = order.estimatedDelivery;
          this.deliveryAddress = order.deliveryAddress;
          this.orderItems = order.items;
          this.totalAmount = order.totalAmount;
          console.log('Custom Order ID set to:', this.customOrderId);
        },
        error: (error) => {
          console.error('Error loading order:', error);
        }
      });
    }
  }

  trackOrder(): void {
    this.router.navigate(['/order-tracking', this.customOrderId]);
  }

  goHome(): void {
    this.router.navigate(['/menu']);
  }
}
