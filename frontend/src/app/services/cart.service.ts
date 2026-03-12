import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CartItem {
  menuItem: any;
  quantity: number;
}

export interface TableInfo {
  tableNumber: string;
  capacity: number;
  location?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  private cartItemCountSubject = new BehaviorSubject<number>(0);
  public cartItemCount$ = this.cartItemCountSubject.asObservable();

  // Table info for dine-in orders
  private tableInfoSubject = new BehaviorSubject<TableInfo | null>(null);
  public tableInfo$ = this.tableInfoSubject.asObservable();

  constructor() {
    this.loadCartFromLocalStorage();
    this.loadTableInfoFromLocalStorage();
  }

  private loadTableInfoFromLocalStorage(): void {
    const tableInfoData = localStorage.getItem('tableInfo');
    if (tableInfoData) {
      const tableInfo = JSON.parse(tableInfoData);
      this.tableInfoSubject.next(tableInfo);
    }
  }

  private loadCartFromLocalStorage(): void {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      const cart = JSON.parse(cartData);
      this.cartSubject.next(cart);
      this.updateCartCount(cart);
    }
  }

  private updateCartCount(cart: CartItem[]): void {
    const count = cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
    this.cartItemCountSubject.next(count);
  }

  getCart(): CartItem[] {
    return this.cartSubject.getValue();
  }

  getCartItemCount(): number {
    return this.cartItemCountSubject.getValue();
  }

  /**
   * Set table info for dine-in orders
   */
  setTableInfo(table: TableInfo): void {
    this.tableInfoSubject.next(table);
    localStorage.setItem('tableInfo', JSON.stringify(table));
  }

  /**
   * Get table info
   */
  getTableInfo(): TableInfo | null {
    return this.tableInfoSubject.getValue();
  }

  /**
   * Clear table info
   */
  clearTableInfo(): void {
    this.tableInfoSubject.next(null);
    localStorage.removeItem('tableInfo');
  }

  /**
   * Reload cart from localStorage
   * This is useful when cart is updated from external sources (e.g., AI voice service)
   */
  reloadCart(): void {
    this.loadCartFromLocalStorage();
  }

  addToCart(menuItem: any): void {
    const cart = this.getCart();
    const existingItem = cart.find((item: CartItem) => item.menuItem._id === menuItem._id);
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ menuItem, quantity: 1 });
    }
    
    this.saveCart(cart);
  }

  removeFromCart(menuItemId: string): void {
    const cart = this.getCart().filter((item: CartItem) => item.menuItem._id !== menuItemId);
    this.saveCart(cart);
  }

  increaseQuantity(menuItemId: string): void {
    const cart = this.getCart();
    const item = cart.find((i: CartItem) => i.menuItem._id === menuItemId);
    if (item) {
      item.quantity++;
      this.saveCart(cart);
    }
  }

  decreaseQuantity(menuItemId: string): void {
    const cart = this.getCart();
    const item = cart.find((i: CartItem) => i.menuItem._id === menuItemId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
        this.saveCart(cart);
      } else {
        this.removeFromCart(menuItemId);
      }
    }
  }

  clearCart(): void {
    this.saveCart([]);
  }

  private saveCart(cart: CartItem[]): void {
    this.cartSubject.next(cart);
    this.updateCartCount(cart);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}
