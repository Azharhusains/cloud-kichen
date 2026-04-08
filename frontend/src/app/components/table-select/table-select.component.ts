import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';

// Services
import { TableService } from '../../services/table.service';
import { SocketService } from '../../services/socket.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './table-select.component.html',
  styleUrls: ['./table-select.component.scss']
})
export class TableSelectComponent implements OnInit, OnDestroy {
  tableForm: FormGroup;
  loading: boolean = false;
  error: string = '';
  selectedTable: any = null;
  orderType: 'delivery' | 'dine-in' = 'delivery';

  tables: any[] = [];
  availableTables: any[] = [];
  private destroy$ = new Subject<void>();
  private lockTimer: any = null;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
    }
  }


  constructor(
    private fb: FormBuilder,
    private tableService: TableService,
    private socketService: SocketService,
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.tableForm = this.fb.group({
      tableNumber: ['', Validators.required]
    });
  }


  ngOnInit(): void {
    // Check if cart has items
    if (this.cartService.getCart().length === 0) {
      this.snackBar.open('Your cart is empty. Please add items first.', 'OK', {
        duration: 3000
      });
      this.router.navigate(['/menu']);
    }
    this.loadTables();
    
    // Socket real-time updates
    this.socketService.onTableLocked()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('Table locked:', data);
        this.refreshTables();
      });

    this.socketService.onTableUnlocked()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('Table unlocked:', data);
        this.refreshTables();
        if (this.selectedTable?.tableNumber === data.tableNumber) {
          this.selectedTable = null;
          this.cartService.clearTableInfo();
          this.snackBar.open(`Table ${data.tableNumber} lock expired`, 'OK', { duration: 3000 });
        }
      });

    this.socketService.onTableStatusBroadcast()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('Table status changed:', data);
        this.refreshTables();
      });
  }

  private refreshTables(): void {
    this.tableService.getTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        // Filter available tables (status === 'available')
        this.availableTables = tables
          .filter(table => table.status === 'available' && table.isActive)
          .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));
        
        // Check if selected table still valid (only if no longer available)
        if (this.selectedTable && this.selectedTable.status !== 'locked' && !this.availableTables.some(t => t.tableNumber === this.selectedTable.tableNumber)) {
          this.selectedTable = null;
          this.cartService.clearTableInfo();
          this.snackBar.open('Selected table no longer available', 'OK', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('Failed to refresh tables', 'OK', { duration: 3000 });
      }
    });
  }

  onOrderTypeChange(type: 'delivery' | 'dine-in'): void {
    this.orderType = type;
    this.selectedTable = null;
    this.tableForm.reset();
    
    if (type === 'delivery') {
      this.cartService.clearTableInfo();
      this.router.navigate(['/checkout']);
    }
  }

  async verifyTable(table?: any): Promise<void> {
    this.loading = true;
    this.error = '';

    let selectedTableData = table;
    if (!table) {
      const tableNumber = this.tableForm.get('tableNumber')?.value;
      selectedTableData = this.availableTables.find(t => t.tableNumber === tableNumber);
    }

    if (!selectedTableData) {
      this.loading = false;
      this.error = 'Please select a valid table.';
      return;
    }

    // NEW: Lock table before proceeding
    try {
      const lockResult = await this.tableService.lockTable(selectedTableData.tableNumber).toPromise();
      console.log('Table locked:', lockResult);
      
      this.selectedTable = lockResult.table;
      this.cartService.setTableInfo(this.selectedTable);
      
      // Start lock timer display
      this.startLockTimer(lockResult.table.lockExpiresAt);
      
      this.snackBar.open(`Table ${selectedTableData.tableNumber} locked for 2 minutes!`, 'OK', { duration: 3000 });
    } catch (error: any) {
      console.error('Lock failed:', error);
      if (error.error?.message?.includes('locked')) {
        this.error = 'Table already locked by another user';
        if (error.error.expiresAt) {
          this.error += ` (expires ${new Date(error.error.expiresAt).toLocaleTimeString()})`;
        }
      } else {
        this.error = error.error?.message || 'Failed to lock table';
      }
    } finally {
      this.loading = false;
    }
  }

  private startLockTimer(expiresAt: Date): void {
    const endTime = new Date(expiresAt).getTime();
    this.lockTimer = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, endTime - now);
      
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      if (timeLeft <= 0) {
        clearInterval(this.lockTimer);
        this.lockTimer = null;
        this.selectedTable = null;
        this.cartService.clearTableInfo();
        this.snackBar.open('Table lock expired', 'OK', { duration: 3000 });
        this.refreshTables();
      }
      // Update selectedTable with time left for UI
      if (this.selectedTable) {
        this.selectedTable.timeLeft = `${minutes}m ${seconds}s`;
      }
    }, 1000);
  }

  proceedToCheckout(): void {
    if (this.selectedTable) {
      this.router.navigate(['/checkout']);
    }
  }

  goBack(): void {
    this.router.navigate(['/menu']);
  }

  clearTable(): void {
    this.selectedTable = null;
    this.tableForm.reset();
    this.cartService.clearTableInfo();
  }

  // Add these UI helper methods
  getTableClass(table: any): string {
    switch (table.status) {
      case 'available': return 'available';
      case 'locked': return 'locked';
      case 'occupied': return 'occupied';
      case 'reserved': return 'reserved';
      default: return 'unknown';
    }
  }

  getTableIcon(table: any): string {
    switch (table.status) {
      case 'available': return 'radio_button_unchecked';
      case 'locked': return 'lock';
      case 'occupied': return 'event_seat';
      case 'reserved': return 'book';
      default: return 'help';
    }
  }

  getTableIconColor(table: any): string {
    switch (table.status) {
      case 'available': return 'success';
      case 'locked': return 'warn';
      case 'occupied': return 'warn';
      case 'reserved': return 'accent';
      default: return 'basic';
    }
  }

  getTableStatusLabel(table: any): string {
    switch (table.status) {
      case 'available': return 'Free';
      case 'locked': return 'Locked';
      case 'occupied': return 'Occupied';
      case 'reserved': return 'Reserved';
      default: return table.status;
    }
  }

  getLockTimeLeft(expiresAt: Date): string {
    const now = Date.now();
    const endTime = new Date(expiresAt).getTime();
    const timeLeft = Math.max(0, endTime - now);
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  loadTables(): void {
    this.tableService.getTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        // Add real-time lock timers to all tables for mat-select options
        const now = Date.now();
        this.tables = this.tables.map(table => {
          if (table.status === 'locked' && table.lockExpiresAt) {
            const endTime = new Date(table.lockExpiresAt).getTime();
            const timeLeft = Math.max(0, endTime - now);
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            table.timeLeft = `${minutes}m ${seconds}s`;
          }
          return table;
        });
        
        this.availableTables = tables
          .filter(table => table.status === 'available' && table.isActive)
          .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));
      },
      error: () => {
        this.snackBar.open('Failed to load tables', 'OK', { duration: 3000 });
      }
    });
  }

  onTableSelect(tableNumber: string): void {
    this.tableForm.patchValue({ tableNumber });
    const table = this.availableTables.find(t => t.tableNumber === tableNumber);
    if (table) {
      this.verifyTable(table);
    }
  }
}

