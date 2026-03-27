import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import {
  ChartData,
  ChartOptions,
  ChartType
} from 'chart.js';
import { environment } from '../../../../environments/environment';
import { SocketService } from '../../../services/socket.service';

interface RevenueStats {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  avgOrderValue: number;
  profitMargin: number;
}

interface PaymentStats {
  cash: number;
  cashAmount: number;
  online: number;
  onlineAmount: number;
  cashPercentage: number;
  onlinePercentage: number;
}

interface RevenueDataPoint {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
  percentage: number;
}

@Component({
  selector: 'app-revenue-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonToggleModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    MatPaginatorModule,
    MatTableModule
  ],
  templateUrl: './revenue-dashboard.component.html',
  styleUrls: ['./revenue-dashboard.component.scss']
})
export class RevenueDashboardComponent implements OnInit {
  stats: RevenueStats | null = null;
  paymentStats: PaymentStats | null = null;
  revenueTrend: RevenueDataPoint[] = [];
  topProducts: TopProduct[] = [];
  recentOrders: any[] = [];
  selectedPeriod = 'today';
  loading = false;

  // Revenue Trend Line Chart
  public lineChartData: ChartData = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Revenue',
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        fill: true
      },
      {
        data: [],
        label: 'Profit',
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        fill: true
      }
    ]
  };
  public lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Revenue & Profit Trend' }
    },
    
  };
  public lineChartType: ChartType = 'line';

  // Payment Breakdown Doughnut Chart
  public doughnutChartData: ChartData = {
    labels: ['Cash', 'Online'],
    datasets: [{ data: [0, 0], backgroundColor: ['#28a745', '#ffc107'] }]
  };
  public doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
      title: { display: true, text: 'Payment Breakdown' },
      tooltip: {
        callbacks: {
          label: (context: { label: any; parsed: number; dataset: any; }) => `${context.label}: ₹${context.parsed.toLocaleString()} (${(context.parsed / (context.dataset as any).total * 100).toFixed(1)}%)`
        }
      }
    }
  };
  public doughnutChartType: ChartType = 'doughnut';

  // Table
  dataSource = new MatTableDataSource<any>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  displayedColumns: string[] = ['orderNumber', 'totalAmount', 'paymentMethod', 'orderStatus', 'createdAt', 'orderType'];
  pageIndex = 0;
  recentPageIndex = 0;
  recentPageSize = 10;

  // Custom pagination methods for recent orders table
  getRecentStartIndex(): number {
    return this.recentPageIndex * this.recentPageSize + 1;
  }

  getRecentEndIndex(): number {
    const end = (this.recentPageIndex + 1) * this.recentPageSize;
    return Math.min(end, this.dataSource.data.length);
  }

  getRecentPageNumbers(): number[] {
    const totalPages = Math.ceil(this.dataSource.data.length / this.recentPageSize);
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.recentPageIndex + 1 - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  previousRecentPage(): void {
    if (this.recentPageIndex > 0) {
      this.recentPageIndex--;
    }
  }

  nextRecentPage(): void {
    if ((this.recentPageIndex + 1) * this.recentPageSize < this.dataSource.data.length) {
      this.recentPageIndex++;
    }
  }

  goToRecentPage(page: number): void {
    this.recentPageIndex = page;
  }

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.socketService.joinAdminRoom();
    this.socketService.onRevenueUpdated().subscribe(() => {
      console.log('Revenue dashboard: Refreshing data due to socket update');
      this.loadRevenue();
    });
    this.loadRevenue();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadRevenue(): void {
    this.loading = true;
    const params = new HttpParams().set('timeRange', this.selectedPeriod);
    
    this.http.get<any>(`${environment.apiUrl}/revenue`, { params }).subscribe({
      next: (data) => {
        this.stats = data.stats;
        this.paymentStats = data.paymentStats;
        this.revenueTrend = data.revenueTrend || [];
        this.topProducts = data.topProducts || [];
        this.recentOrders = data.recentOrders || [];
        
        // Update charts
        this.updateRevenueChart();
        this.updatePaymentChart();
        
        // Update table
        this.dataSource.data = this.recentOrders;
        this.dataSource.paginator = this.paginator;
        
        // Reset pagination
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load revenue data:', error);
        this.loading = false;
      }
    });
  }

  // Chart update methods (no-op for placeholder mode)
  private updateRevenueChart(): void {
    if (this.revenueTrend && this.revenueTrend.length > 0) {
      this.lineChartData = {
        labels: this.revenueTrend.map(item => item.date),
        datasets: [
          {
            data: this.revenueTrend.map(item => item.revenue),
            label: 'Revenue',
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            fill: true
          },
          {
            data: this.revenueTrend.map(item => item.profit),
            label: 'Profit',
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            fill: true
          }
        ]
      };
    }
    this.cdr.detectChanges();
  }

  private updatePaymentChart(): void {
    if (this.paymentStats) {
      const total = this.paymentStats.cashAmount + this.paymentStats.onlineAmount;
      this.doughnutChartData = {
        labels: ['Cash', 'Online'],
        datasets: [{
          data: [this.paymentStats.cashAmount, this.paymentStats.onlineAmount],
          backgroundColor: ['#28a745', '#ffc107']
        }]
      };
    }
    this.cdr.detectChanges();
  }

  formatCurrency(value: number): string {
    return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'received': '#ffc107',
      'preparing': '#007bff',
      'ready': '#28a745',
      'delivered': '#28a745',
      'completed': '#28a745',
      'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
  }

  getPaymentIcon(method: string): string {
    return method === 'cash' ? 'payment' : 'credit_card';
  }
}

