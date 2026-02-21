import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { MenuService } from '../../../services/menu.service';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  todayOrders: any[] = [];
  totalRevenue = 0;
  totalOrders = 0;
  menuItems: any[] = [];

  constructor(
    private orderService: OrderService,
    private menuService: MenuService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Load today's orders
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        const today = new Date().toDateString();
        this.todayOrders = orders.filter(order =>
          new Date(order.createdAt).toDateString() === today
        );
        this.totalOrders = this.todayOrders.length;
        this.totalRevenue = this.todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
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
