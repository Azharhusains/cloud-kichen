import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
export class TableSelectComponent implements OnInit {
  tableForm: FormGroup;
  loading: boolean = false;
  error: string = '';
  selectedTable: any = null;
  orderType: 'delivery' | 'dine-in' = 'delivery';

  tables: any[] = [];
  availableTables: any[] = [];

  constructor(
    private fb: FormBuilder,
    private tableService: TableService,
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

  verifyTable(table?: any): void {
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

    this.selectedTable = selectedTableData;
    this.loading = false;
    this.cartService.setTableInfo(this.selectedTable);
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

  loadTables(): void {
    this.tableService.getTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.availableTables = tables
          .filter(table => table.status === 'available')
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

