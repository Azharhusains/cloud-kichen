import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

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
  viewingItem?: any;
  categories: { name: string; displayName: string }[];
}

@Component({
  selector: 'app-menu-item-dialog',
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
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="menu-item-dialog mb">
      <h2 mat-dialog-title>
        <mat-icon>restaurant_menu</mat-icon>
        {{ data.viewingItem?.name }}
        <button mat-icon-button class="close-button" (click)="onClose()">
          <mat-icon>close</mat-icon>
        </button>
      </h2>
      
      <mat-dialog-content>
        <div class="item-details" *ngIf="data.viewingItem">
          <div class="item-image">
            <mat-icon class="food-icon">restaurant</mat-icon>
          </div>
          
          <div class="item-info">
            <div class="category-chip">
              <mat-icon>category</mat-icon>
              {{ getCategoryDisplayName(data.viewingItem.category) }}
            </div>
            
            <p class="description">{{ data.viewingItem.description }}</p>
            
            <div class="price-section">
              <span class="price">₹{{ data.viewingItem.price?.toFixed(2) }}</span>
              <span class="availability" [class.available]="data.viewingItem.isAvailable">
                {{ data.viewingItem.isAvailable ? 'Available' : 'Unavailable' }}
              </span>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onClose()">Close</button>
        <button mat-raised-button color="primary" (click)="onAddToCart()" [disabled]="!data.viewingItem?.isAvailable">
          <mat-icon>add_shopping_cart</mat-icon>
          Add to Cart
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .menu-item-dialog {
      min-width: 400px;
      max-height: 100vh;
      overflow: hidden;
      padding: 16px;
      
      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        margin: -24px -24px 0 -24px !important;
        padding: 20px 24px !important;
        border-radius: 4px 4px 0 0;

        mat-icon {
          color: white;
        }

        .close-button {
          color: white;
          margin-left: auto;
          
          mat-icon {
            color: white;
          }
        }
      }
    }

    mat-dialog-content {
      overflow: hidden !important;
      max-height: none !important;
    }

    .item-details {
      padding-top: 16px;

      .item-image {
        width: 100%;
        height: 150px;
        background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;

        .food-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: #667eea;
        }
      }

      .item-info {
        .category-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          margin-bottom: 12px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }

        .description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .price-section {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .price {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
          }

          .availability {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            background: rgba(244, 67, 54, 0.1);
            color: #f44336;

            &.available {
              background: rgba(76, 175, 80, 0.1);
              color: #4caf50;
            }
          }
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 0 0 !important;

      button.mat-mdc-raised-button {
        transition: all 0.3s ease;
        border: 2px solid transparent;
        
        &:hover {
          border: 2px solid #667eea;
        }
      }
    }

    @media (max-width: 500px) {
      .menu-item-dialog {
        min-width: auto;
      }
    }
  `]
})
export class MenuItemDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<MenuItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MenuItemDialogData
  ) {}

  ngOnInit(): void {}

  getCategoryDisplayName(categoryName: string): string {
    const category = this.data.categories?.find(c => c.name === categoryName);
    return category?.displayName || categoryName;
  }

  onAddToCart(): void {
    this.dialogRef.close(true);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
