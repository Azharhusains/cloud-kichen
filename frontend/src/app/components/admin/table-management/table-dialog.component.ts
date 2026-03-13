import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

export interface TableDialogData {
  editingTable?: any;
}

@Component({
  selector: 'app-table-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule
  ],
  template: `
    <div class="table-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ data.editingTable ? 'edit' : 'add' }}</mat-icon>
        {{ data.editingTable ? 'Edit Table' : 'Add New Table' }}
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="tableForm" class="table-form">
          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Table Number</mat-label>
            <input matInput formControlName="tableNumber" placeholder="e.g., T1, A1, 5">
            <mat-icon matPrefix>table_bar</mat-icon>
            <mat-error *ngIf="tableForm.get('tableNumber')?.hasError('required')" class="error-text">
              Table number is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Capacity (seats)</mat-label>
            <input matInput type="number" formControlName="capacity" min="1">
            <mat-icon matPrefix>people</mat-icon>
            <mat-error *ngIf="tableForm.get('capacity')?.hasError('required')" class="error-text">
              Capacity is required
            </mat-error>
            <mat-error *ngIf="tableForm.get('capacity')?.hasError('min')" class="error-text">
              Capacity must be at least 1
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="available">
                <mat-icon>check_circle</mat-icon>
                Available
              </mat-option>
              <mat-option value="occupied">
                <mat-icon>person</mat-icon>
                Occupied
              </mat-option>
              <mat-option value="reserved">
                <mat-icon>event</mat-icon>
                Reserved
              </mat-option>
            </mat-select>
            <mat-error *ngIf="tableForm.get('status')?.hasError('required')" class="error-text">
              Status is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Location (optional)</mat-label>
            <input matInput formControlName="location" placeholder="e.g., Ground Floor, Window side">
            <mat-icon matPrefix>location_on</mat-icon>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!tableForm.valid">
          <mat-icon>{{ data.editingTable ? 'save' : 'add' }}</mat-icon>
          {{ data.editingTable ? 'Update' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .table-dialog {
      min-width: 400px;
      
      ::ng-deep .mat-mdc-dialog-content {
        max-height: 60vh;
      }

      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 16px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        
        mat-icon {
          color: white;
        }
      }
    }

    .table-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 16px;

      .full-width {
        width: 100%;
      }

      mat-form-field {
        width: 100%;
      }
    }

    ::ng-deep .error-text {
      color: #f44336 !important;
    }

    mat-dialog-actions {
      padding: 16px 24px !important;
      gap: 12px;
    }

    @media (max-width: 500px) {
      .table-dialog {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class TableDialogComponent implements OnInit {
  tableForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TableDialogData
  ) {
    this.tableForm = this.fb.group({
      tableNumber: ['', Validators.required],
      capacity: [4, [Validators.required, Validators.min(1)]],
      status: ['available', Validators.required],
      location: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.editingTable) {
      this.tableForm.patchValue({
        tableNumber: this.data.editingTable.tableNumber,
        capacity: this.data.editingTable.capacity,
        status: this.data.editingTable.status,
        location: this.data.editingTable.location || ''
      });
    }
  }

  onSubmit(): void {
    if (this.tableForm.invalid) {
      this.tableForm.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.tableForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

