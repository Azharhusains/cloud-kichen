import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TableService } from '../../../services/table.service';
import { SocketService } from '../../../services/socket.service';
import { ToastService } from '../../../services/toast.service';
import { TableDialogComponent } from './table-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule
  ],
  templateUrl: './table-management.component.html',
  styleUrls: ['./table-management.component.scss']
})
export class TableManagementComponent implements OnInit, OnDestroy {
  tables: any[] = [];
  filteredTables: any[] = [];
  searchTerm: string = '';
  loading: boolean = false;

  constructor(
    private tableService: TableService,
    private socketService: SocketService,
    private dialog: MatDialog,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTables();
    this.setupSocketListeners();
    this.setupVisibilityListener();
  }

  ngOnDestroy(): void {
    // Socket will be disconnected when leaving the admin area
  }

  setupVisibilityListener(): void {
    this.socketService.visibilityChange$.subscribe({
      next: (isVisible) => {
        if (isVisible) {
          console.log('TableManagement: Tab became visible, refreshing data...');
          this.loadTables();
        }
      },
      error: (err: any) => console.error('Visibility change error:', err)
    });
  }

  setupSocketListeners(): void {
    // Join admin room for real-time updates
    this.socketService.joinAdminRoom();

    // Listen for table status changes
    this.socketService.onTableStatusChanged().subscribe({
      next: (updatedTable: any) => {
        console.log('TableManagement: Received table status change:', updatedTable);
        this.updateTableInList(updatedTable);
        this.toastService.info(`Table ${updatedTable.tableNumber} status changed to ${updatedTable.status}`);
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Socket table status error:', err)
    });

    // Also listen for broadcast as fallback
    this.socketService.onTableStatusBroadcast().subscribe({
      next: (updatedTable: any) => {
        console.log('TableManagement: Received table status broadcast:', updatedTable);
        this.updateTableInList(updatedTable);
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Socket table broadcast error:', err)
    });
  }

  updateTableInList(updatedTable: any): void {
    const index = this.tables.findIndex(t => t._id === updatedTable._id);
    if (index !== -1) {
      this.tables[index] = { ...updatedTable };
      this.filterTables();
    }
  }

  loadTables(): void {
    this.loading = true;
    this.tableService.getTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.filteredTables = tables;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tables:', err);
        this.toastService.error('Error loading tables');
        this.loading = false;
      }
    });
  }

  filterTables(): void {
    const searchLower = this.searchTerm.toLowerCase().trim();
    if (searchLower === '') {
      this.filteredTables = this.tables;
    } else {
      this.filteredTables = this.tables.filter(table =>
        table.tableNumber.toLowerCase().includes(searchLower) ||
        (table.location && table.location.toLowerCase().includes(searchLower)) ||
        table.status.toLowerCase().includes(searchLower)
      );
    }
  }

  showAddForm(): void {
    const dialogRef = this.dialog.open(TableDialogComponent, {
      width: '500px',
      data: {
        editingTable: null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tableService.createTable(result).subscribe({
          next: () => {
            this.loadTables();
            this.toastService.success('Table created successfully!');
          },
          error: (error) => {
            console.error('Error creating table:', error);
            const errorMsg = error.error?.message || 'Error creating table';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  editTable(table: any): void {
    const dialogRef = this.dialog.open(TableDialogComponent, {
      width: '500px',
      data: {
        editingTable: table
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tableService.updateTable(table._id, result).subscribe({
          next: () => {
            this.loadTables();
            this.toastService.success('Table updated successfully!');
          },
          error: (error) => {
            console.error('Error updating table:', error);
            const errorMsg = error.error?.message || 'Error updating table';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  deleteTable(table: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Table',
        message: 'Are you sure you want to delete this table? This action cannot be undone.',
        itemName: `Table ${table.tableNumber}`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tableService.deleteTable(table._id).subscribe({
          next: () => {
            this.loadTables();
            this.toastService.success('Table deleted successfully!');
          },
          error: (error) => {
            console.error('Error deleting table:', error);
            const errorMsg = error.error?.message || 'Error deleting table';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  updateTableStatus(table: any, status: string): void {
    this.tableService.updateTableStatus(table.tableNumber, status).subscribe({
      next: () => {
        this.loadTables();
        this.toastService.success(`Table marked as ${status}!`);
      },
      error: (error) => {
        console.error('Error updating table status:', error);
        const errorMsg = error.error?.message || 'Error updating table status';
        this.toastService.error(errorMsg);
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'accent';
      case 'occupied': return 'warn';
      case 'reserved': return 'primary';
      default: return '';
    }
  }
}

