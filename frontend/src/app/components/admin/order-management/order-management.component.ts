import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../../services/order.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule
  ],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];
  statusFilter = '';
  searchTerm = '';
  
  // Statistics
  totalOrders = 0;
  pendingOrders = 0;
  readyOrders = 0;
  deliveredOrders = 0;
  totalRevenue = 0;
  averageOrderValue = 0;
  
  // Status counts
  statusCounts: { [key: string]: number } = {
    received: 0,
    preparing: 0,
    ready: 0,
    delivered: 0
  };
  
  // Expanded orders tracking
  expandedOrders: Set<string> = new Set();

  constructor(
    private orderService: OrderService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.calculateStatistics();
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.snackBar.open('Error loading orders', 'Close', { duration: 3000 });
      }
    });
  }

  calculateStatistics(): void {
    this.totalOrders = this.orders.length;
    
    // Calculate status counts
    this.statusCounts = {
      received: 0,
      preparing: 0,
      ready: 0,
      delivered: 0
    };
    
    this.pendingOrders = 0;
    this.readyOrders = 0;
    this.deliveredOrders = 0;
    this.totalRevenue = 0;
    
    this.orders.forEach(order => {
      // Count by status
      if (this.statusCounts[order.orderStatus] !== undefined) {
        this.statusCounts[order.orderStatus]++;
      }
      
      // Pending = received + preparing
      if (order.orderStatus === 'received' || order.orderStatus === 'preparing') {
        this.pendingOrders++;
      }
      
      if (order.orderStatus === 'ready') {
        this.readyOrders++;
      }
      
      if (order.orderStatus === 'delivered') {
        this.deliveredOrders++;
      }
      
      // Revenue (only from delivered orders)
      if (order.orderStatus === 'delivered' && order.totalAmount) {
        this.totalRevenue += order.totalAmount;
      }
    });
    
    // Calculate average order value
    this.averageOrderValue = this.totalOrders > 0 ? this.totalRevenue / this.orders.length : 0;
  }

  applyFilters(): void {
    let result = [...this.orders];
    
    // Apply status filter
    if (this.statusFilter) {
      result = result.filter(order => order.orderStatus === this.statusFilter);
    }
    
    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      // Convert search term to number if it's a numeric string (for order_id search)
      const searchNumber = !isNaN(Number(this.searchTerm)) ? Number(this.searchTerm) : null;
      
      result = result.filter(order => 
        // Search by order_id (human-friendly number)
        (searchNumber !== null && order.order_id === searchNumber) ||
        // Search by user name
        (order.user?.name && order.user.name.toLowerCase().includes(search)) ||
        // Search by user email
        (order.user?.email && order.user.email.toLowerCase().includes(search)) ||
        // Search by delivery address
        (order.deliveryAddress?.street && order.deliveryAddress.street.toLowerCase().includes(search))
      );
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    this.filteredOrders = result;
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  updateOrderStatus(orderId: string, newStatus: string): void {
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this.loadOrders();
        this.snackBar.open(`Order status updated to ${newStatus}`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.snackBar.open('Error updating order status', 'Close', { duration: 3000 });
      }
    });
  }

  quickUpdateStatus(orderId: string, newStatus: string): void {
    this.updateOrderStatus(orderId, newStatus);
  }

  getStatusOptions(currentStatus: string): string[] {
    const allStatuses = ['received', 'preparing', 'ready', 'delivered'];
    const currentIndex = allStatuses.indexOf(currentStatus);
    return allStatuses.slice(currentIndex);
  }

  getStatusIndex(status: string): number {
    const statuses = ['received', 'preparing', 'ready', 'delivered'];
    return statuses.indexOf(status);
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'received': 'radio_button_checked',
      'preparing': 'sync',
      'ready': 'check_circle',
      'delivered': 'done_all'
    };
    return icons[status] || 'help_outline';
  }

  toggleOrderExpand(orderId: string): void {
    if (this.expandedOrders.has(orderId)) {
      this.expandedOrders.delete(orderId);
    } else {
      this.expandedOrders.add(orderId);
    }
  }

  isOrderExpanded(orderId: string): boolean {
    return this.expandedOrders.has(orderId);
  }

  getStatusProgress(order: any): number {
    const currentIndex = this.getStatusIndex(order.orderStatus);
    return ((currentIndex + 1) / 4) * 100;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  printOrder(order: any): void {
    // Create print-friendly content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const content = `
        <html>
          <head>
            <title>Order #${order.order_id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              .info { margin: 10px 0; }
              .items { margin-top: 20px; }
              .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
              .status { display: inline-block; padding: 4px 12px; background: #667eea; color: white; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Order #${order.order_id}</h1>
            <div class="info"><strong>Customer:</strong> ${order.user?.name || 'N/A'} (${order.user?.email || 'N/A'})</div>
            <div class="info"><strong>Date:</strong> ${this.formatDate(order.createdAt)}</div>
            <div class="info"><strong>Status:</strong> <span class="status">${order.orderStatus}</span></div>
            <div class="info"><strong>Delivery Address:</strong> ${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}, ${order.deliveryAddress?.state} ${order.deliveryAddress?.zipCode}</div>
            <div class="items">
              <h3>Items:</h3>
              ${order.items.map((item: any) => `
                <div class="item">
                  <span>${item.menuItem?.name || 'Item'} x${item.quantity}</span>
                  <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            <div class="total">Total: ₹${order.totalAmount?.toFixed(2) || '0.00'}</div>
            ${order.profit ? `<div class="info"><strong>Profit:</strong> ₹${order.profit.toFixed(2)}</div>` : ''}
          </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatDate(dateString);
  }

  isUrgent(order: any): boolean {
    // Consider order urgent if it's been more than 30 minutes and still in received/preparing
    if (order.orderStatus === 'received' || order.orderStatus === 'preparing') {
      const date = new Date(order.createdAt);
      const now = new Date();
      const diffMins = (now.getTime() - date.getTime()) / 60000;
      return diffMins > 30;
    }
    return false;
  }
}
