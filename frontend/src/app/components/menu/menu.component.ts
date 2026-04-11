import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { MenuService, MenuItem } from '../../services/menu.service';
import { CategoryService, Category } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

// Dialog Component
import { MenuItemDialogComponent } from './menu-item-dialog.component';

// Voice Order Component (for AI Modal)
import { VoiceOrderComponent } from '../voice-order/voice-order.component';
import { KitchenService, KitchenStatus } from '../../services/kitchen.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        query('.menu-item-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class MenuComponent implements OnInit, OnDestroy {
  categories: any[] = [];
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  selectedCategory: string = 'all';
  cart: any[] = [];
  cartItemCount: number = 0;
  isLoggedIn: boolean = false;
  searchTerm: string = '';
  kitchenStatus: KitchenStatus | null = null;
  kitchenOpenHours = { open: '11:00 AM', close: '10:00 PM' };
  private cartSubscription!: Subscription;
  private kitchenSub!: Subscription;
  private menuSocketSub!: Subscription;

  constructor(
    private menuService: MenuService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private kitchenService: KitchenService,
    private socketService: SocketService,
    public router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadMenuItems();
    this.loadCart();
    this.isLoggedIn = this.authService.isAuthenticated();

    // Kitchen status for UI disable
    this.kitchenService.getStatus().subscribe(status => {
      this.kitchenStatus = status;
    });
    this.kitchenService.status$.subscribe(status => {
      this.kitchenStatus = status;
    });

    // Subscribe to cart changes for real-time updates
    this.cartSubscription = this.cartService.cart$.subscribe((cart: any[]) => {
      this.cart = cart;
      this.cartItemCount = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    });

    // Subscribe to menu availability changes for real-time updates
    this.menuSocketSub = this.socketService.onMenuAvailabilityChanged().subscribe((updatedItem: MenuItem) => {
      console.log('MenuComponent: Menu item updated via socket:', updatedItem.name, 'Available:', updatedItem.isAvailable);
      const index = this.menuItems.findIndex(item => item._id === updatedItem._id);
      if (index > -1) {
        this.menuItems[index] = { ...this.menuItems[index], ...updatedItem };
        console.log('MenuComponent: Updated menu item at index', index);
      } else {
        // Add new item if not found
        this.menuItems.push(updatedItem);
        console.log('MenuComponent: Added new menu item');
      }
      // Refresh filtered items
      if (this.selectedCategory === 'all') {
        this.filteredItems = [...this.menuItems];
      } else {
        this.filteredItems = this.menuItems.filter(item => item.category === this.selectedCategory);
      }
      this.applySearch(); // Re-apply search filter if active
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.menuSocketSub) {
      this.menuSocketSub.unsubscribe();
    }
  }

  loadCategories(): void {
    this.categoryService.getActiveCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories = [{ name: 'all', displayName: 'All' }, ...categories];
      },
      error: (error: any) => console.error('Error loading categories:', error)
    });
  }

  loadMenuItems(): void {
    this.menuService.getMenuItems().subscribe({
      next: (response: any) => {
        this.menuItems = response.menuItems || [];
        this.filteredItems = [...this.menuItems];
      },
      error: (error: any) => console.error('Error loading menu items:', error)
    });
  }

  loadCart(): void {
    this.cart = this.cartService.getCart();
    this.cartItemCount = this.cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  }

  selectCategory(categoryName: string): void {
    this.selectedCategory = categoryName;
    if (categoryName === 'all') {
      this.filteredItems = [...this.menuItems];
    } else {
      this.filteredItems = this.menuItems.filter((item: MenuItem) => item.category === categoryName);
    }
    this.applySearch();
  }

  searchMenuItems(): void {
    this.applySearch();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applySearch();
  }

  private applySearch(): void {
    if (!this.searchTerm.trim()) {
      if (this.selectedCategory === 'all') {
        this.filteredItems = [...this.menuItems];
      } else {
        this.filteredItems = this.menuItems.filter((item: MenuItem) => item.category === this.selectedCategory);
      }
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    let baseItems: MenuItem[];

    if (this.selectedCategory === 'all') {
      baseItems = this.menuItems;
    } else {
      baseItems = this.menuItems.filter((item: MenuItem) => item.category === this.selectedCategory);
    }

    this.filteredItems = baseItems.filter((item: MenuItem) =>
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    );
  }

  getCategoryDisplayName(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category?.displayName || categoryName;
  }

  addToCart(item: MenuItem): void {
    this.cartService.addToCart(item);
  }

  increaseQuantity(item: MenuItem): void {
    const type = this.getCurrentPortionType(item);
    this.cartService.increaseQuantity(item._id, type);
  }

  decreaseQuantity(item: MenuItem): void {
    const type = this.getCurrentPortionType(item);
    this.cartService.decreaseQuantity(item._id, type);
  }

  getItemQuantity(item: MenuItem): number {
    const fullQty = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'FULL')?.quantity || 0;
    const halfQty = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'HALF')?.quantity || 0;
    return fullQty + halfQty;
  }

  private lastPortionTypes: { [key: string]: 'HALF' | 'FULL' } = {};

  getCurrentPortionType(item: MenuItem): 'FULL' | 'HALF' {
    // Prioritize last selected type for immediate feedback
    if (this.lastPortionTypes[item._id]) {
      return this.lastPortionTypes[item._id];
    }
    const halfItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'HALF');
    const fullItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'FULL');
    const halfQty = halfItem?.quantity || 0;
    const fullQty = fullItem?.quantity || 0;
    // Prefer the portion with higher quantity; fallback to FULL
    return fullQty > halfQty ? 'FULL' : (halfQty > 0 ? 'HALF' : 'FULL');
  }

  getCurrentQuantity(item: MenuItem): number {
    const type = this.getCurrentPortionType(item);
    const cartItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === type);
    return cartItem ? cartItem.quantity : 0;
  }

  getHalfQuantity(item: MenuItem): number {
    const cartItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'HALF');
    return cartItem ? cartItem.quantity : 0;
  }

  getFullQuantity(item: MenuItem): number {
    const cartItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === 'FULL');
    return cartItem ? cartItem.quantity : 0;
  }

  getQtyForPortion(item: MenuItem, type: 'FULL' | 'HALF'): number {
    const cartItem = this.cart.find((c: any) => c.menuItem._id === item._id && c.quantityType === type);
    return cartItem ? cartItem.quantity : 0;
  }

  addCurrentPortion(item: MenuItem): void {
    this.cartService.addToCart(item, this.getCurrentPortionType(item));
  }

  togglePortion(item: MenuItem): void {
    const currentType = this.getCurrentPortionType(item);
    const newType = currentType === 'FULL' ? 'HALF' : 'FULL';
    this.selectPortion(item, newType);
  }

  selectPortion(item: MenuItem, portionType: 'HALF' | 'FULL'): void {
    this.lastPortionTypes[item._id] = portionType;
  }

  removeFromCart(menuItem: any): void {
    this.cartService.removeFromCart(menuItem._id);
  }

  getItemPrice(item: MenuItem, quantityType: 'FULL' | 'HALF' = 'FULL'): number {
    if (!item.supportsHalf || quantityType === 'FULL') {
      return item.fullPrice || item.price || 0;
    }
    return item.halfPrice || 0;
  }

  getTotalPrice(): number {
    return this.cart.reduce((sum, cartItem: any) => {
      const price = this.getItemPrice(cartItem.menuItem, cartItem.quantityType || 'FULL');
      return sum + (price * cartItem.quantity);
    }, 0);
  }

  checkout(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/cart']);
  }

  openItemDetails(item: MenuItem): void {
    const dialogRef = this.dialog.open(MenuItemDialogComponent, {
      width: '500px',
      data: { 
        viewingItem: item,
        categories: this.categories.filter(c => c.name !== 'all')
      }
    });

    dialogRef.afterClosed().subscribe(); // Dialog handles cart addition
  }

  /**
   * Open AI Voice Order dialog
   * Only accessible when user is logged in
   */
  openAIOrderDialog(): void {
    if (!this.isLoggedIn) {
      this.snackBar.open('Please login to use AI Voice Ordering', 'Login', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      }).onAction().subscribe(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    const dialogRef = this.dialog.open(VoiceOrderComponent, {
      width: '600px',
      maxHeight: '80vh',
      panelClass: 'ai-voice-dialog',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      // Optional: handle dialog close
    });
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    // Handle relative paths
    if (imagePath.startsWith('/uploads/')) {
      // Extract the base URL from environment (e.g., http://192.168.31.8:5000)
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${imagePath}`;
    }
    return imagePath;
  }
}

