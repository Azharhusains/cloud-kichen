import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableService } from '../../../services/table.service';

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    MatTooltipModule
  ],
  templateUrl: './table-management.component.html',
  styleUrls: ['./table-management.component.scss']
})
export class TableManagementComponent implements OnInit {
  tables: any[] = [];
  displayedColumns: string[] = ['tableNumber', 'capacity', 'status', 'location', 'actions'];
  tableForm: FormGroup;
  isEditing: boolean = false;
  editingTableId: string | null = null;
  loading: boolean = false;

  constructor(
    private tableService: TableService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.tableForm = this.fb.group({
      tableNumber: ['', Validators.required],
      capacity: [4, [Validators.required, Validators.min(1)]],
      status: ['available', Validators.required],
      location: ['']
    });
  }

  ngOnInit(): void {
    this.loadTables();
  }

  loadTables(): void {
    this.loading = true;
    this.tableService.getTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tables:', err);
        this.snackBar.open('Error loading tables', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.tableForm.valid) return;

    const tableData = this.tableForm.value;

    if (this.isEditing && this.editingTableId) {
      this.tableService.updateTable(this.editingTableId, tableData).subscribe({
        next: () => {
          this.snackBar.open('Table updated successfully', 'Close', { duration: 3000 });
          this.resetForm();
          this.loadTables();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Error updating table', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.tableService.createTable(tableData).subscribe({
        next: () => {
          this.snackBar.open('Table created successfully', 'Close', { duration: 3000 });
          this.resetForm();
          this.loadTables();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Error creating table', 'Close', { duration: 3000 });
        }
      });
    }
  }

  editTable(table: any): void {
    this.isEditing = true;
    this.editingTableId = table._id;
    this.tableForm.patchValue({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      location: table.location || ''
    });
  }

  deleteTable(table: any): void {
    if (confirm(`Are you sure you want to delete table ${table.tableNumber}?`)) {
      this.tableService.deleteTable(table._id).subscribe({
        next: () => {
          this.snackBar.open('Table deleted successfully', 'Close', { duration: 3000 });
          this.loadTables();
        },
        error: (err) => {
          this.snackBar.open('Error deleting table', 'Close', { duration: 3000 });
        }
      });
    }
  }

  updateTableStatus(table: any, status: string): void {
    this.tableService.updateTableStatus(table.tableNumber, status).subscribe({
      next: () => {
        this.snackBar.open(`Table ${table.tableNumber} marked as ${status}`, 'Close', { duration: 3000 });
        this.loadTables();
      },
      error: (err) => {
        this.snackBar.open('Error updating table status', 'Close', { duration: 3000 });
      }
    });
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingTableId = null;
    this.tableForm.reset({
      tableNumber: '',
      capacity: 4,
      status: 'available',
      location: ''
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

