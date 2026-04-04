import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

// Angular Material Modules (expanded to match menu)
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Angular Animations (matching menu exactly)
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services (matching menu + existing)
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { MenuService, MenuItem } from '../../services/menu.service'; // For type compatibility
import { ToastService } from '../../services/toast.service';
import { OrderService } from '../../services/order.service';

// Dialog (reuse menu's or placeholder)
import { MenuItemDialogComponent } from '../menu/menu-item-dialog.component';

export interface RecommendationItem {
  item: any;
  totalQty?: number;
}

export interface ComboRecommendation {
  items: any[];
  count?: number;
}

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.scss'],
  animations: [
    // Exact copy from menu.component.ts
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        query('.rec-item-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class RecommendationsComponent implements OnInit, OnDestroy {
@Input() recommendations: any[] = [];
  @Input() section: 'CUSTOMER' | 'popular' | 'combos' = 'CUSTOMER';
  @Input() title = 'Recommendations';
  
  loading = false;
  isLoggedIn = false;
  currentUserId = '';
  cart: any[] = [];
  private cartSubscription!: Subscription;
  private lastPortionTypes: { [key: string]: 'HALF' | 'FULL' } = {};

  constructor(
    public cartService: CartService,
    private authService: AuthService,
    private menuService: MenuService,
    private orderService: OrderService,
    private toastService: ToastService,
    private dialog: MatDialog,
    public router: Router,
    private snackBar: MatSnackBar
  ) {}

  private authSub!: Subscription;

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    const user = this.authService.getCurrentUser();
    if (user?._id) this.currentUserId = user._id;
    
    // Reactive auth state
    this.authSub = this.authService.user$.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user?._id) this.currentUserId = user._id;
    });
    
    this.loadCart();
    this.cartSubscription = this.cartService.cart$.subscribe((cart: any[]) => {
      this.cart = cart;
    });
  }

ngOnDestroy(): void {
    if (this.cartSubscription) this.cartSubscription.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
  }

  loadCart(): void {
    this.cart = this.cartService.getCart();
  }

  // Copied exactly from menu.component.ts for identical behavior
  getCurrentPortionType(item: any): 'FULL' | 'HALF' {
    if (this.lastPortionTypes[item._id]) return this.lastPortionTypes[item._id];
    const halfItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'HALF');
    const fullItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'FULL');
    const halfQty = halfItem?.quantity || 0;
    const fullQty = fullItem?.quantity || 0;
    return fullQty > halfQty ? 'FULL' : (halfQty > 0 ? 'HALF' : 'FULL');
  }

  getCurrentQuantity(item: any): number {
    const type = this.getCurrentPortionType(item);
    const cartItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === type);
    return cartItem ? cartItem.quantity : 0;
  }

  selectPortion(item: any, portionType: 'HALF' | 'FULL'): void {
    this.lastPortionTypes[item._id] = portionType;
  }

  addCurrentPortion(rec: RecommendationItem): void {
    if (!this.isLoggedIn) {
      this.handleUnauthorized();
      return;
    }
    this.cartService.addToCart(rec.item, this.getCurrentPortionType(rec.item));
     this.router.navigate(['/menu']);
    // this.toastService.show(`Added ${rec.item.name} to cart!`, 'success');
  }

  increaseQuantity(item: any): void {
    if (!this.isLoggedIn) {
      this.handleUnauthorized();
      return;
    }
    const type = this.getCurrentPortionType(item);
    this.cartService.increaseQuantity(item._id, type);
  }

  decreaseQuantity(item: any): void {
    if (!this.isLoggedIn) {
      this.handleUnauthorized();
      return;
    }
    const type = this.getCurrentPortionType(item);
    this.cartService.decreaseQuantity(item._id, type);
  }

  getItemPrice(item: any, quantityType: 'FULL' | 'HALF' = 'FULL'): number {
    if (!item.supportsHalf || quantityType === 'FULL') {
      return item.fullPrice || item.price || 0;
    }
    return item.halfPrice || 0;
  }

  addCombo(items: any[]): void {
    if (!this.isLoggedIn) {
      this.handleUnauthorized();
      return;
    }
    items.forEach(item => this.cartService.addToCart(item, 'FULL'));
    this.toastService.show('Combo added to cart!', 'success');
  }

  openItemDetails(item: any): void {
    const dialogRef = this.dialog.open(MenuItemDialogComponent, {
      width: '500px',
      data: { viewingItem: item }
    });
  }

  handleUnauthorized(): void {
    this.router.navigate(['/login']);
  }

  getImageUrl(image: string | undefined | null): string {
    if (!image) return '';
    if (image.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${image}`;
    }
    if (image && !image.startsWith('http')) {
      return `http://localhost:5000${image}`;
    }
    return image || '';
  }

  trackByFn(index: number, item: any): any {
    if (this.section === 'combos') {
      return item.items?.map((i: any) => i._id).join('-') || index;
    }
    return item.item?._id || index;
  }

  getSectionTitle(): string {
    switch (this.section) {
      case 'CUSTOMER': return this.title || 'Recommended for You';
      case 'popular': return 'Popular Right Now';
      case 'combos': return 'Great Combos';
      default: return 'Recommendations';
    }
  }
}

