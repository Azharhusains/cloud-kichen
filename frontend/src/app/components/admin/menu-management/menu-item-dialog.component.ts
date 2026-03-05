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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface MenuItemDialogData {
  editingItem?: any;
  categories: { name: string; displayName: string }[];
}

@Component({
  selector: 'app-menu-item-dialog',
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
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="menu-item-dialog">
      <h2 mat-dialog-title>
        {{ data.editingItem ? 'Edit Menu Item' : 'Add New Menu Item' }}
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="menuForm" class="menu-form">
          <!-- Image Upload Section -->
          <div class="image-upload-section">
            <div class="image-preview" *ngIf="imagePreview || data.editingItem?.image">
              <img [src]="imagePreview || getImageUrl(data.editingItem?.image)" crossorigin="anonymous" alt="Menu item image" >
              <button mat-icon-button class="remove-image-btn" (click)="removeImage()" type="button">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="image-placeholder" *ngIf="!imagePreview && !data.editingItem?.image">
              <mat-icon>add_photo_alternate</mat-icon>
              <span>Add Image</span>
            </div>
            <input 
              type="file" 
              #fileInput 
              (change)="onFileSelected($event)" 
              accept="image/*" 
              hidden>
            <button 
              mat-stroked-button 
              color="primary" 
              (click)="fileInput.click()" 
              type="button"
              class="upload-btn">
              <mat-icon>cloud_upload</mat-icon>
              {{ imagePreview || data.editingItem?.image ? 'Change Image' : 'Upload Image' }}
            </button>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Item Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter item name">
            <mat-error *ngIf="menuForm.get('name')?.hasError('required')" class="error-text">
              Name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category</mat-label>
            <mat-select formControlName="category">
              <mat-option *ngFor="let category of data.categories" [value]="category.name">
                {{ category.displayName }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="menuForm.get('category')?.hasError('required')" class="error-text">
              Category is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="Enter item description" maxlength="45"></textarea>
            <mat-hint align="end">{{ menuForm.get('description')?.value?.length || 0 }}/45</mat-hint>
            <mat-error *ngIf="menuForm.get('description')?.hasError('required')" class="error-text">
              Description is required
            </mat-error>
            <mat-error *ngIf="menuForm.get('description')?.hasError('maxlength')" class="error-text">
              Description cannot exceed 45 characters
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline">
<mat-label>Price (₹)</mat-label>
              <input matInput type="number" formControlName="price" step="0.01" min="0.01">
              <mat-icon matPrefix>currency_rupee</mat-icon>
              <mat-error *ngIf="menuForm.get('price')?.hasError('required')" class="error-text">
                Price is required
              </mat-error>
              <mat-error *ngIf="menuForm.get('price')?.hasError('min')" class="error-text">
                Price must be positive
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
<mat-label>Cost Price (₹)</mat-label>
              <input matInput type="number" formControlName="costPrice" step="0.01" min="0.01">
              <mat-icon matPrefix>currency_rupee</mat-icon>
              <mat-error *ngIf="menuForm.get('costPrice')?.hasError('required')" class="error-text">
                Cost price is required
              </mat-error>
              <mat-error *ngIf="menuForm.get('costPrice')?.hasError('min')" class="error-text">
                Cost price must be positive
              </mat-error>
            </mat-form-field>
          </div>

          <mat-slide-toggle formControlName="isAvailable" color="primary">
            Available
          </mat-slide-toggle>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!menuForm.valid">
          <mat-icon>{{ data.editingItem ? 'save' : 'add' }}</mat-icon>
          {{ data.editingItem ? 'Update' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .menu-item-dialog {
      min-width: 500px;
      
      ::ng-deep .mat-mdc-dialog-content {
        max-height: 60vh;
      }
    }

    .menu-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 16px;

      .full-width {
        width: 100%;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;

        mat-form-field {
          width: 100%;
        }
      }

      mat-slide-toggle {
        margin-top: 8px;
      }
    }

    .image-upload-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 16px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .image-preview {
      position: relative;
      width: 150px;
      height: 150px;
      border-radius: 8px;
      overflow: hidden;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .remove-image-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
      }
    }

    .image-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 150px;
      height: 150px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      color: #888;
      cursor: pointer;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }
    }

    .upload-btn {
      width: 100%;
    }

    ::ng-deep .error-text {
      color: #f44336 !important;
    }

    @media (max-width: 600px) {
      .menu-item-dialog {
        min-width: auto;
      }
      
      .menu-form .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MenuItemDialogComponent implements OnInit {
  menuForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  private environment = { apiUrl: '' };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MenuItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MenuItemDialogData
  ) {
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(45)]],
      price: [null, [Validators.required, Validators.min(1)]],
      costPrice: [null, [Validators.required, Validators.min(1)]],
      isAvailable: [true]
    });
  }

  ngOnInit(): void {
    if (this.data.editingItem) {
      this.menuForm.patchValue(this.data.editingItem);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    // Handle relative paths
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:5000${imagePath}`;
    }
    return imagePath;
  }

  onSubmit(): void {
    if (this.menuForm.invalid) {
      this.menuForm.markAllAsTouched();
      return;
    }

    const formValue = this.menuForm.value;
    
    // If there's a new image file selected, use FormData approach
    if (this.selectedFile) {
      const result = {
        ...formValue,
        imageFile: this.selectedFile
      };
      this.dialogRef.close(result);
    } else {
      // No new image selected, just return form values
      // If editing and removing existing image
      if (this.data.editingItem && !this.imagePreview && this.data.editingItem.image) {
        this.dialogRef.close({
          ...formValue,
          image: null
        });
      } else {
        this.dialogRef.close(formValue);
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
