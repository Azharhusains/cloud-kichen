import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
    MatTooltipModule
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
  private cartSubscription!: Subscription;

  constructor(
    private menuService: MenuService,
    private categoryService: CategoryService,
    private authService: AuthService,
    public router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadMenuItems();
    this.loadCart();
    this.isLoggedIn = this.authService.isAuthenticated();

    // Subscribe to cart count from CartService for real-time updates
    this.cartSubscription = this.cartService.cartItemCount$.subscribe((count: number) => {
      this.cartItemCount = count;
      this.cart = this.cartService.getCart();
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
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
    this.cartItemCount = this.cartService.getCartItemCount();
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
    
    this.snackBar.open(`${item.name} added to cart!`, 'View Cart', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    }).onAction().subscribe(() => {
      this.router.navigate(['/cart']);
    });
  }

  increaseQuantity(menuItem: any): void {
    this.cartService.increaseQuantity(menuItem._id);
  }

  decreaseQuantity(menuItem: any): void {
    this.cartService.decreaseQuantity(menuItem._id);
  }

  removeFromCart(menuItem: any): void {
    this.cartService.removeFromCart(menuItem._id);
  }

  getTotalPrice(): number {
    return this.cart.reduce((sum, item: any) => sum + (item.menuItem.price * item.quantity), 0);
  }

  checkout(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/checkout']);
  }

  openItemDetails(item: MenuItem): void {
    const dialogRef = this.dialog.open(MenuItemDialogComponent, {
      width: '500px',
      data: { 
        viewingItem: item,
        categories: this.categories.filter(c => c.name !== 'all')
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addToCart(item);
      }
    });
  }
}
