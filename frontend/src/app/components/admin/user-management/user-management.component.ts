import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  orderCount: number;
  createdAt: Date;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit {
  dataSource = new MatTableDataSource<User>();
  displayedColumns: string[] = ['name', 'email', 'role', 'orderCount', 'createdAt', 'actions'];
  searchTerm: string = '';
  pageSize = 10;
  totalUsers = 0;
  currentPage = 0;
  isSuperAdmin = false;
  isLoading = false;
  errorMessage = '';
  hasNoDataMessage = false;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userRole = this.authService.getUserRole();
    this.isSuperAdmin = userRole === 'SUPER_ADMIN';
    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      this.errorMessage = 'Access denied. Admin or Super Admin role required.';
      this.toastService.error(this.errorMessage);
      return;
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.totalUsers = data.length;
        this.hasNoDataMessage = data.length === 0;
        if (data.length === 0) {
          this.toastService.info('No users found. Restaurant staff will appear here once registered.');
        }
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        console.error('Error loading users:', error);
        if (error.status === 401) {
          this.errorMessage = 'Authentication failed. Please login again.';
          this.toastService.error(this.errorMessage);
        } else if (error.status === 403) {
          this.errorMessage = 'Access denied. Admin privileges required.';
          this.toastService.error(this.errorMessage);
        } else {
          this.errorMessage = 'Failed to load users. Please try again.';
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  applyFilter(): void {
    const filterValue = this.searchTerm.toLowerCase();
    this.dataSource.filter = filterValue.trim();
    this.totalUsers = this.dataSource.filteredData.length;
    this.hasNoDataMessage = this.totalUsers === 0;
    if (this.totalUsers === 0) {
      this.toastService.info('No users match your search. Try different keywords.');
    }
  }

  // Custom pagination methods matching order-management style
  getStartIndex(): number {
    return this.currentPage * this.pageSize + 1;
  }

  getEndIndex(): number {
    const end = (this.currentPage + 1) * this.pageSize;
    return Math.min(end, this.totalUsers);
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalUsers / this.pageSize);
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage + 1 - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if ((this.currentPage + 1) * this.pageSize < this.totalUsers) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  promoteUser(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Promote User to Admin',
        message: 'Are you sure you want to promote this user to Admin role? They will gain full administrative access to the restaurant management system. This action cannot be undone.',
        itemName: user.name,
        confirmText: 'Promote',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.patch(`${environment.apiUrl}/users/${user._id}/promote-to-admin`, {}).subscribe({
          next: (response: any) => {
            this.toastService.success('User promoted successfully!');
            this.loadUsers(); // Reload list
          },
          error: (error: any) => {
            console.error('Promotion failed:', error);
            this.toastService.error('Failed to promote user: ' + (error.error?.message || 'Unknown error'));
          }
        });
      }
    });
  }
}

