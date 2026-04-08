import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

// Local MenuItem (matching MenuService)
export interface MenuItem {
  _id: string;
  name: string;
  category: string;
  description: string;
  supportsHalf: boolean;
  fullPrice: number;
  halfPrice?: number;
  price?: number;
  image: string | null;
  isAvailable: boolean;
  totalQuantity?: number;
  orderCount?: number;
  popularityScore?: number;
}

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './recommendation.component.html',
  styleUrls: ['./recommendation.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        query('.menu-item-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(150, [
            animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class RecommendationComponent implements OnInit, OnDestroy {
  @Input() items: MenuItem[] = [];
  @Input() isLoggedIn: boolean = false;

  cart: any[] = [];
  cartItemCount: number = 0;
  private lastPortionTypes: { [key: string]: 'HALF' | 'FULL' } = {};
  private cartSubscription!: Subscription;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cart = this.cartService.getCart();
    this.cartItemCount = this.cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    
    this.cartSubscription = this.cartService.cart$.subscribe((cart: any[]) => {
      this.cart = cart;
      this.cartItemCount = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${imagePath}`;
    }
    return `/backend/uploads/menu-images/${imagePath}`;
  }

  getCurrentPortionType(item: MenuItem): 'FULL' | 'HALF' {
    // Check last selected portion first for visual feedback
    if (this.lastPortionTypes[item._id]) {
      return this.lastPortionTypes[item._id];
    }
    // Fallback to cart state
    const halfItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'HALF');
    const fullItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'FULL');
    const halfQty = halfItem?.quantity || 0;
    const fullQty = fullItem?.quantity || 0;
    return fullQty > halfQty ? 'FULL' : (halfQty > 0 ? 'HALF' : 'FULL');
  }

  getCurrentQuantity(item: MenuItem): number {
    const type = this.getCurrentPortionType(item);
    const cartItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === type);
    return cartItem ? cartItem.quantity : 0;
  }

  getItemPrice(item: MenuItem, quantityType: 'FULL' | 'HALF' = 'FULL'): number {
    if (!item.supportsHalf || quantityType === 'FULL') {
      return item.fullPrice || item.price || 0;
    }
    return item.halfPrice || 0;
  }

  selectPortion(item: MenuItem, portionType: 'HALF' | 'FULL'): void {
    this.lastPortionTypes[item._id] = portionType;
  }

  requireLogin(): boolean {
    if (!this.isLoggedIn) {
      this.snackBar.open('Please login to add items to cart', 'Login', {
        duration: 3000
      });
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }

  addCurrentPortion(item: MenuItem): void {
    if (!this.requireLogin()) return;
    const type = this.getCurrentPortionType(item);
    this.cartService.addToCart(item, type);
    this.router.navigate(['/menu']);
    this.snackBar.open(`${item.name} added to cart!`, 'View Cart', {
      duration: 2000
    });
  }

  increaseQuantity(item: MenuItem): void {
    if (!this.requireLogin()) return;
    const type = this.getCurrentPortionType(item);
    this.cartService.increaseQuantity(item._id, type);
  }

  decreaseQuantity(item: MenuItem): void {
    if (!this.requireLogin()) return;
    const type = this.getCurrentPortionType(item);
    this.cartService.decreaseQuantity(item._id, type);
  }
}

