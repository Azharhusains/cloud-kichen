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
  }

  onOrderTypeChange(type: 'delivery' | 'dine-in'): void {
    this.orderType = type;
    this.selectedTable = null;
    this.tableForm.reset();
    
    if (type === 'delivery') {
      this.router.navigate(['/checkout']);
    }
  }

  verifyTable(): void {
    if (!this.tableForm.valid) return;
    
    this.loading = true;
    this.error = '';
    
    const tableNumber = this.tableForm.get('tableNumber')?.value.trim().toUpperCase();
    
    this.tableService.getTableByNumber(tableNumber).subscribe({
      next: (table) => {
        this.selectedTable = table;
        this.loading = false;
        
        // Check table status
        if (table.status === 'occupied') {
          this.error = `Table ${tableNumber} is currently occupied. Please choose a different table or try delivery.`;
          this.selectedTable = null;
          return;
        }
        
        if (table.status === 'reserved') {
          this.error = `Table ${tableNumber} is reserved. Please choose a different table or try delivery.`;
          this.selectedTable = null;
          return;
        }
        
        // Table is available - store table info in cart service for checkout
        this.cartService.setTableInfo(table);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Table not found. Please check the table number.';
        this.selectedTable = null;
      }
    });
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
}

