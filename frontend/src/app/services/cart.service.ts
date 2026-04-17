import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OrderService } from './order.service';

export interface CartItem {
  menuItem: any;
  quantity: number;
  quantityType: 'FULL' | 'HALF';
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

constructor(private orderService: OrderService) {
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
    this.reloadTableInfo();
  }

  /**
   * Reload table info from localStorage
   */
  reloadTableInfo(): void {
    this.loadTableInfoFromLocalStorage();
  }

  /**
   * Validate current table session - clear if no active master order
   * @returns Observable<boolean> - true if valid or cleared
   */
  validateTableSession(): Observable<boolean> {
    const tableInfo = this.getTableInfo();
    if (!tableInfo) {
      return of(true);
    }
    return this.orderService.hasActiveMasterOrder(tableInfo.tableNumber).pipe(
      tap(hasActive => {
        if (!hasActive) {
          this.clearTableInfo();
        }
      }),
      map(() => true)
    );
  }

  /**
   * Reload cart from localStorage
   * This is useful when cart is updated from external sources (e.g., AI voice service)
   */
  reloadCart(): void {
    this.loadCartFromLocalStorage();
  }

  addToCart(menuItem: any, quantityType: 'FULL' | 'HALF' = 'FULL'): void {
    const cart = this.getCart();
    const existingItemIndex = cart.findIndex((item: CartItem) => 
      item.menuItem._id === menuItem._id && item.quantityType === quantityType
    );
    
    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity++;
    } else {
      cart.push({ menuItem, quantity: 1, quantityType });
    }
    
    this.saveCart(cart);
  }

  removeFromCart(menuItemId: string, quantityType?: 'FULL' | 'HALF'): void {
    let cart = this.getCart();
    if (quantityType) {
      cart = cart.filter((item: CartItem) => !(item.menuItem._id === menuItemId && item.quantityType === quantityType));
    } else {
      cart = cart.filter((item: CartItem) => item.menuItem._id !== menuItemId);
    }
    this.saveCart(cart);
  }

  toggleQuantityType(menuItemId: string, currentType: 'FULL' | 'HALF'): void {
    const newType = currentType === 'FULL' ? 'HALF' : 'FULL';
    const cart = this.getCart();
    const itemIndex = cart.findIndex((item: CartItem) => item.menuItem._id === menuItemId && item.quantityType === currentType);
    if (itemIndex !== -1) {
      cart[itemIndex].quantityType = newType;
      this.saveCart(cart);
    }
  }

  increaseQuantity(menuItemId: string, quantityType: 'FULL' | 'HALF'): void {
    const cart = this.getCart();
    const itemIndex = cart.findIndex((i: CartItem) => i.menuItem._id === menuItemId && i.quantityType === quantityType);
    if (itemIndex !== -1) {
      cart[itemIndex].quantity++;
      this.saveCart(cart);
    }
  }

  decreaseQuantity(menuItemId: string, quantityType: 'FULL' | 'HALF'): void {
    const cart = this.getCart();
    const itemIndex = cart.findIndex((i: CartItem) => i.menuItem._id === menuItemId && i.quantityType === quantityType);
    if (itemIndex !== -1) {
      if (cart[itemIndex].quantity > 1) {
        cart[itemIndex].quantity--;
        this.saveCart(cart);
      } else {
        cart.splice(itemIndex, 1);
        this.saveCart(cart);
      }
    }
  }

  clearCart(): void {
    this.saveCart([]);
    // Auto-clear stale table sessions when cart is cleared
    this.validateTableSession().subscribe();
  }

  getCartItemPrice(item: CartItem): number {
    const menuItem = item.menuItem;
    if (!menuItem.supportsHalf || item.quantityType === 'FULL') {
      return menuItem.fullPrice || menuItem.price || 0;
    }
    return menuItem.halfPrice || 0;
  }

  getSubtotal(): number {
    const cart = this.getCart();
    return cart.reduce((sum: number, item: CartItem) => {
      return sum + (this.getCartItemPrice(item) * item.quantity);
    }, 0);
  }


  saveCart(cart: CartItem[]): void {
    this.cartSubject.next(cart);
    this.updateCartCount(cart);
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  clearItemById(menuItemId: string): void {
    const cart = this.getCart();
    const filteredCart = cart.filter((item: CartItem) => item.menuItem._id !== menuItemId);
    this.saveCart(filteredCart);
  }

}
