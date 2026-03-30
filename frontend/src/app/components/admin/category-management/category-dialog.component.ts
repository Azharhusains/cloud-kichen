import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface CategoryDialogData {
  editingCategory?: {
    _id?: string;
    name: string;
    displayName: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
  };
}

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="category-dialog">
      <h2 mat-dialog-title>
        {{ data.editingCategory ? 'Edit Category' : 'Add New Category' }}
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="categoryForm" class="category-form">
          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Display Name</mat-label>
            <input matInput formControlName="displayName" placeholder="e.g., Birani, Korma, Tandoori">
            <mat-error *ngIf="categoryForm.get('displayName')?.hasError('required')" class="error-text">
              Display name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Name (URL-friendly)</mat-label>
            <input matInput formControlName="name" placeholder="e.g., birani, korma, tandoori">
            <mat-hint>Use lowercase letters, numbers, and hyphens only</mat-hint>
            <mat-error *ngIf="categoryForm.get('name')?.hasError('required')" class="error-text">
              Name is required
            </mat-error>
            <mat-error *ngIf="categoryForm.get('name')?.hasError('pattern')" class="error-text">
              Only lowercase letters, numbers, and hyphens allowed
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="Enter category description (optional)"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Sort Order</mat-label>
            <input matInput type="number" formControlName="sortOrder">
            <mat-hint>Lower numbers appear first</mat-hint>
          </mat-form-field>

          <mat-slide-toggle formControlName="isActive" color="primary">
            Active
          </mat-slide-toggle>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!categoryForm.valid">
          <mat-icon>{{ data.editingCategory ? 'save' : 'add' }}</mat-icon>
          {{ data.editingCategory ? 'Update' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .category-dialog {
      min-width: 450px;
      
      ::ng-deep .mat-mdc-dialog-content {
        max-height: 60vh;
      }
    }

    .category-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 16px;

      .full-width {
        width: 100%;
      }

      mat-slide-toggle {
        margin-top: 8px;
      }
    }

/* Component-level Error Styling - Moved to Global (exact match from login/register/checkout) */
::ng-deep {
  .mat-mdc-form-field-error {
    color: #f44336 !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
  }

  .mat-mdc-error {
    color: #f44336 !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
  }

  // Additional Angular Material error states
  .mat-form-field-invalid .mat-mdc-form-field-flex {
    border-bottom-color: #f44336 !important;
  }

  .mat-mdc-form-field-invalid .mdc-text-field__input {
    caret-color: #f44336 !important;
  }
}

    @media (max-width: 600px) {
      .category-dialog {
        min-width: auto;
      }
    }
  `]
})
export class CategoryDialogComponent implements OnInit {
  categoryForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryDialogData
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      displayName: ['', Validators.required],
      description: [''],
      isActive: [true],
      sortOrder: [0]
    });
  }

  ngOnInit(): void {
    if (this.data.editingCategory) {
      this.categoryForm.patchValue({
        name: this.data.editingCategory.name,
        displayName: this.data.editingCategory.displayName,
        description: this.data.editingCategory.description || '',
        isActive: this.data.editingCategory.isActive,
        sortOrder: this.data.editingCategory.sortOrder
      });
    }
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.categoryForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
