import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { UserService, User, UsersResponse } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

// Role Dialog
import { RoleDialogComponent } from './role-dialog/role-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatPaginatorModule, MatSortModule, 
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, 
    MatSelectModule, MatProgressSpinnerModule, MatDialogModule, 
    MatSnackBarModule, MatTooltipModule, MatChipsModule, MatCardModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['name', 'email', 'role', 'createdAt', 'actions'];
  dataSource: User[] = [];
  isLoading = false;
  totalUsers = 0;
  page = 1;
  limit = 10;
  search = '';
  roleFilter = 'all';

  private destroy$ = new Subject<void>();
  private refreshTimeout: any;

  roleOptions = [
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' }
  ];

  getRoleColor(role: string): 'primary' | 'accent' | 'warn' {
    switch (role) {
      case 'CUSTOMER': return 'primary';
      case 'ADMIN': return 'accent';
      case 'SUPER_ADMIN': return 'warn';
      default: return 'primary';
    }
  }

  constructor(
    private userService: UserService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers(this.page, this.limit, this.search, this.roleFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: UsersResponse) => {
          this.dataSource = response.users;
          this.totalUsers = response.pagination.total;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.toastService.show('Error loading users', 'error');
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadUsers();
  }

  onSearch(): void {
    this.page = 1;
    this.loadUsers();
  }

  onRoleFilter(): void {
    this.page = 1;
    this.loadUsers();
  }

  updateRole(user: User): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '400px',
      data: { user, currentRole: user.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.updateUserRole(user._id, result.role).subscribe({
          next: (response) => {
            user.role = response.role;
            this.toastService.show(`Role updated to ${result.label}`, 'success');
          },
          error: (error) => {
            console.error('Role update error:', error);
            this.toastService.show(error.error?.message || 'Failed to update role', 'error');
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
