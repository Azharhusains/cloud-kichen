import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { CartService, CartItem } from '../../services/cart.service';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        query('.cart-item', [
          style({ opacity: 0, transform: 'translateX(20px)' }),
          stagger(100, [
            animate('0.3s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class CartComponent implements OnInit, OnDestroy {
  cart: CartItem[] = [];
  deliveryCharge: number = 2.99;
  taxRate: number = 0.05;
  private cartSubscription!: Subscription;

constructor(private router: Router, public cartService: CartService) {}

  ngOnInit(): void {
    // Subscribe to cart changes from CartService for real-time updates
    this.cartSubscription = this.cartService.cart$.subscribe((cart: CartItem[]) => {
      this.cart = cart;
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  increaseQuantity(item: CartItem): void {
    this.cartService.increaseQuantity(item.menuItem._id, item.quantityType);
  }

  decreaseQuantity(item: CartItem): void {
    this.cartService.decreaseQuantity(item.menuItem._id, item.quantityType);
  }

  removeFromCart(item: CartItem): void {
    this.cartService.removeFromCart(item.menuItem._id, item.quantityType);
  }

  getSubtotal(): number {
    return this.cartService.getSubtotal();
  }

  getTax(): number {
    return this.getSubtotal() * this.taxRate;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTax() + (this.deliveryCharge || 0);
  }

  continueShopping(): void {
    this.router.navigate(['/menu']);
  }

  checkout(): void {
    // Navigate to table-select to choose between dine-in or delivery
    this.router.navigate(['/table-select']);
  }
}
