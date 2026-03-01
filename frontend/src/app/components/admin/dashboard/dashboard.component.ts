import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { MenuService } from '../../../services/menu.service';
import { SocketService } from '../../../services/socket.service';
import { ToastService } from '../../../services/toast.service';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatSnackBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  todayOrders: any[] = [];
  totalRevenue = 0;
  totalOrders = 0;
  menuItems: any[] = [];
  newOrdersCount = 0;

  constructor(
    private orderService: OrderService,
    private menuService: MenuService,
    private socketService: SocketService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupSocketListeners();
    this.setupVisibilityListener();
  }

  ngOnDestroy(): void {
    // Don't disconnect the socket as it's a singleton service
    // but we could remove listeners if needed
  }

  setupVisibilityListener(): void {
    // Subscribe to visibility change events to refresh data when tab becomes visible
    this.socketService.visibilityChange$.subscribe({
      next: (isVisible) => {
        if (isVisible) {
          console.log('Dashboard: Tab became visible, refreshing data...');
          this.loadDashboardData();
        }
      },
      error: (err) => console.error('Visibility change error:', err)
    });
  }

  setupSocketListeners(): void {
    // Join admin room for real-time updates
    this.socketService.joinAdminRoom();

    // Listen for new orders
    this.socketService.onNewOrder().subscribe({
      next: (order) => {
        console.log('Dashboard: New order received:', order);
        this.todayOrders.unshift(order);
        this.calculateStatistics();
        this.newOrdersCount++;
        this.cdr.detectChanges();
        this.toastService.success(`New order received! Order #${order.orderNumber}`);
      },
      error: (err) => console.error('Socket error:', err)
    });

    // Listen for order updates
    this.socketService.onOrderUpdated().subscribe({
      next: (updatedOrder) => {
        console.log('Dashboard: Order updated:', updatedOrder);
        const index = this.todayOrders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          this.todayOrders[index] = { ...updatedOrder };
          this.calculateStatistics();
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Socket error:', err)
    });

    // Also listen for broadcast as fallback
    this.socketService.onOrderStatusBroadcast().subscribe({
      next: (updatedOrder) => {
        const index = this.todayOrders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          this.todayOrders[index] = { ...updatedOrder };
          this.calculateStatistics();
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Socket broadcast error:', err)
    });
  }

  loadDashboardData(): void {
    // Load today's orders
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        const today = new Date().toDateString();
        this.todayOrders = orders.filter(order =>
          new Date(order.createdAt).toDateString() === today
        );
        this.calculateStatistics();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.toastService.error('Error loading orders');
      }
    });

    // Load menu items
    this.menuService.getMenuItems().subscribe({
      next: (items:any) => {
        this.menuItems = items;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
      }
    });
  }

  calculateStatistics(): void {
    this.totalOrders = this.todayOrders.length;
    this.totalRevenue = this.todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  }

  navigateToOrders(): void {
    this.router.navigate(['/admin/orders']);
  }

  navigateToMenu(): void {
    this.router.navigate(['/admin/menu']);
  }

  navigateToInventory(): void {
    this.router.navigate(['/admin/inventory']);
  }

  navigateToCategory(): void {
    this.router.navigate(['/admin/categories']);
  }
}
