import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { OrderService } from '../../../services/order.service';
import { SocketService } from '../../../services/socket.service';
import { ToastService } from '../../../services/toast.service';
import { AudioService } from '../../../services/audio.service';
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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CancelOrderDialogComponent } from '../confirm-dialog/cancel-order-dialog.component';
import { InvoiceComponent } from '../../invoice/invoice.component';

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
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit, OnDestroy {
  isSuperAdmin = false;
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
    delivered: 0,
    completed: 0,
    cancelled: 0
  };
  
  // Expanded orders tracking
  expandedOrders: Set<string> = new Set();

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;
  paginatedOrders: any[] = [];

  // Cancel reason
  cancelReason = '';

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private socketService: SocketService,
    private toastService: ToastService,
    private audioService: AudioService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const userRole = this.authService.getUserRole();
    this.isSuperAdmin = userRole === 'SUPER_ADMIN';
    
    this.loadOrders();
    this.setupSocketListeners();
    this.setupVisibilityListener();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  setupVisibilityListener(): void {
    this.socketService.visibilityChange$.subscribe({
      next: (isVisible) => {
        if (isVisible) {
          console.log('OrderManagement: Tab became visible, refreshing data...');
          this.loadOrders();
        }
      },
      error: (err: any) => console.error('Visibility change error:', err)
    });
  }

  setupSocketListeners(): void {
    // Join admin room for real-time updates
    this.socketService.joinAdminRoom();

    // Listen for new orders
    this.socketService.onNewOrder().subscribe({
      next: (order: any) => {
        this.orders.unshift(order);
        this.calculateStatistics();
        this.applyFilters();
        this.cdr.detectChanges();
        this.toastService.success(`New order received! Order #${order.orderNumber}`);
        // Play sound notification for new order
        setTimeout(() => {
          this.audioService.playOrderNotification();
        }, 2000);
      },
      error: (err: any) => console.error('Socket error:', err)
    });

    // Listen for order updates
    this.socketService.onOrderUpdated().subscribe({
      next: (updatedOrder: any) => {
        const index = this.orders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          this.orders[index] = { ...updatedOrder };
          this.calculateStatistics();
          this.applyFilters();
          this.cdr.detectChanges();
          this.toastService.info(`Order #${updatedOrder.orderNumber} updated to ${updatedOrder.orderStatus}`);
        }
      },
      error: (err: any) => console.error('Socket error:', err)
    });

    // Also listen for broadcast as fallback
    this.socketService.onOrderStatusBroadcast().subscribe({
      next: (updatedOrder: any) => {
        const index = this.orders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          this.orders[index] = { ...updatedOrder };
          this.calculateStatistics();
          this.applyFilters();
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => console.error('Socket broadcast error:', err)
    });

    // Listen for order cancellations
    this.socketService.onOrderCancelled().subscribe({
      next: (cancelledOrder: any) => {
        const index = this.orders.findIndex(o => o._id === cancelledOrder._id);
        if (index !== -1) {
          this.orders[index] = { ...cancelledOrder };
          this.calculateStatistics();
          this.applyFilters();
          this.cdr.detectChanges();
          this.toastService.warning(`Order #${cancelledOrder.orderNumber} has been cancelled`);
        }
      },
      error: (err: any) => console.error('Socket cancel error:', err)
    });
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (orders: any[]) => {
        this.orders = orders;
        this.calculateStatistics();
        this.applyFilters();
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.toastService.error('Error loading orders');
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
      delivered: 0,
      completed: 0,
      cancelled: 0
    };
    
    this.pendingOrders = 0;
    this.readyOrders = 0;
    this.deliveredOrders = 0;
    this.totalRevenue = 0;
    
    this.orders.forEach((order: any) => {
      // Count by status
      if (this.statusCounts[order.orderStatus] !== undefined) {
        this.statusCounts[order.orderStatus]++;
      } else if (order.orderStatus === 'cancelled') {
        this.statusCounts['cancelled']++;
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
      
      // Revenue (from delivered or completed orders)
      if ((order.orderStatus === 'delivered' || order.orderStatus === 'completed') && order.totalAmount) {
        this.totalRevenue += order.totalAmount;
      }
    });
    
    // Calculate average order value
    this.averageOrderValue = this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0;
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
      
      result = result.filter((order: any) => 
        // Search by MongoDB _id
        order._id.toLowerCase().includes(search) ||
        // Search by user name
        (order.user?.name && order.user.name.toLowerCase().includes(search)) ||
        // Search by user email
        (order.user?.email && order.user.email.toLowerCase().includes(search)) ||
        // Search by delivery address
        (order.deliveryAddress?.street && order.deliveryAddress.street.toLowerCase().includes(search))
      );
    }
    
    // Sort by date (newest first)
    result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    this.filteredOrders = result;
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    if (this.totalPages < 1) this.totalPages = 1;
    this.updatePaginatedOrders();
  }

  // Pagination methods
  updatePaginatedOrders(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedOrders();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedOrders();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedOrders();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredOrders.length);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    if (this.totalPages < 1) this.totalPages = 1;
    this.updatePaginatedOrders();
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
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
      },
      error: (error: any) => {
        console.error('Error updating order status:', error);
        this.toastService.error('Error updating order status');
      }
    });
  }

  quickUpdateStatus(orderId: string, newStatus: string): void {
    this.updateOrderStatus(orderId, newStatus);
  }

  cancelOrder(order: any): void {
    const dialogRef = this.dialog.open(CancelOrderDialogComponent, {
      width: '450px',
      data: {
        orderNumber: order.orderNumber,
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel this order? Please provide a reason.',
        userType: 'admin'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((reason: string | null) => {
      if (reason && reason.trim() !== '') {
        this.orderService.cancelOrder(order._id, reason.trim()).subscribe({
          next: () => {
            this.loadOrders();
            this.toastService.success(`Order #${order.orderNumber} has been cancelled`);
          },
          error: (error: any) => {
            console.error('Error cancelling order:', error);
            this.toastService.error(error.error?.message || 'Error cancelling order');
          }
        });
      }
    });
  }

  getStatusOptions(currentStatus: string): string[] {
    const allStatuses = ['received', 'preparing', 'ready', 'delivered', 'completed'];
    const currentIndex = allStatuses.indexOf(currentStatus);
    return allStatuses.slice(currentIndex);
  }

  getStatusIndex(status: string): number {
    const statuses = ['received', 'preparing', 'ready', 'delivered', 'completed'];
    return statuses.indexOf(status);
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'received': 'radio_button_checked',
      'preparing': 'sync',
      'ready': 'check_circle',
      'delivered': 'done_all',
      'completed': 'event_available',
      'cancelled': 'cancel'
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
    // 5 statuses: received, preparing, ready, delivered, completed
    return ((currentIndex + 1) / 5) * 100;
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

  /**
   * Check if invoice is available for order
   */
  canShowInvoice(order: any): boolean {
    return ['delivered', 'completed'].includes(order.orderStatus);
  }

  /**
   * Open invoice dialog from profile
   */
  openInvoice(orderId: string): void {
    const dialogRef = this.dialog.open(InvoiceComponent, {
      width: '60vw',
      maxWidth: '600px',
      maxHeight: '95vh',
      data: { orderId },
      panelClass: 'invoice-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Profile invoice dialog closed:', result);
    });
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
    if (order.orderStatus === 'received' || order.orderStatus === 'preparing') {
      const date = new Date(order.createdAt);
      const now = new Date();
      const diffMins = (now.getTime() - date.getTime()) / 60000;
      return diffMins > 30;
    }
    return false;
  }

  getPaymentMethodIcon(paymentMethod: string): string {
    const icons: { [key: string]: string } = {
      'cash': 'payments',
      'online': 'payment'
    };
    return icons[paymentMethod] || 'help_outline';
  }

  getPaymentMethodLabel(paymentMethod: string): string {
    return paymentMethod === 'cash' ? 'CASH' : 'ONLINE';
  }

  getPaymentMethodColor(paymentMethod: string): string {
    return paymentMethod === 'cash' ? 'warn' : 'primary';
  }

  // 🔥 PREMIUM: Refund status helpers
  getRefundStatusColor(refundStatus: string | null): string {
    const colors: { [key: string]: string } = {
      'succeeded': 'primary',
      'processing': 'accent', 
      'failed': 'warn',
      'manual_pending': 'warn',
      null: ''
    };
    return colors[refundStatus || ''] || '';
  }

  getRefundStatusIcon(refundStatus: string | null): string {
    const icons: { [key: string]: string } = {
      'succeeded': 'check_circle',
      'processing': 'autorenew', 
      'failed': 'error',
      'manual_pending': 'payments',
      null: ''
    };
    return icons[refundStatus || ''] || 'help_outline';
  }

  getRefundStatusLabel(refundStatus: string | null): string {
    const labels: { [key: string]: string } = {
      'succeeded': 'Refunded ✅',
      'processing': 'Processing...',
      'failed': 'Failed ❌', 
      'manual_pending': 'Cash Manual'
    };
    return labels[refundStatus || ''] || 'No Refund';
  }

  testAudio(): void {
    console.log('OrderManagement: Testing audio notification');
    this.audioService.enableAudio();
    this.audioService.testAudio();
  }
}
