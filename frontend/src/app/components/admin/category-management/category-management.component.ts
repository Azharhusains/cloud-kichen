import { Component, OnInit } from '@angular/core';
import { CategoryService, Category } from '../../../services/category.service';
import { ToastService } from '../../../services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { CategoryDialogComponent } from './category-dialog.component';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss']
})
export class CategoryManagementComponent implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  searchTerm: string = '';
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private categoryService: CategoryService,
    private dialog: MatDialog,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.filteredCategories = [...categories];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.error = 'Failed to load categories. Please try again.';
        this.toastService.error(this.error);
        this.loading = false;
      }
    });
  }

  filterCategories(): void {
    if (!this.searchTerm) {
      this.filteredCategories = [...this.categories];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredCategories = this.categories.filter(category =>
        category.name.toLowerCase().includes(term) ||
        category.displayName.toLowerCase().includes(term) ||
        (category.description && category.description.toLowerCase().includes(term))
      );
    }
  }

  showAddForm(): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '500px',
      data: {
        editingCategory: null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.categoryService.createCategory(result).subscribe({
          next: () => {
            this.toastService.success('Category created successfully!');
            this.loadCategories();
          },
          error: (error) => {
            const errorMsg = error.error?.message || 'Failed to create category. Please try again.';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  editCategory(category: Category): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '500px',
      data: {
        editingCategory: category
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.categoryService.updateCategory(category._id!, result).subscribe({
          next: () => {
            this.toastService.success('Category updated successfully!');
            this.loadCategories();
          },
          error: (error) => {
            const errorMsg = error.error?.message || 'Failed to update category. Please try again.';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }

  deleteCategory(category: Category): void {
    if (confirm(`Are you sure you want to delete the category "${category.displayName}"?`)) {
      this.categoryService.deleteCategory(category._id!).subscribe({
        next: () => {
          this.toastService.success('Category deleted successfully!');
          this.loadCategories();
        },
        error: (error) => {
          const errorMsg = error.error?.message || 'Failed to delete category. It may be in use by menu items.';
          this.toastService.error(errorMsg);
        }
      });
    }
  }

  toggleCategoryStatus(category: Category): void {
    const updatedCategory = {
      ...category,
      isActive: !category.isActive
    };
    
    this.categoryService.updateCategory(category._id!, updatedCategory).subscribe({
      next: () => {
        this.toastService.success(`Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully!`);
        this.loadCategories();
      },
      error: (error) => {
        const errorMsg = error.error?.message || 'Failed to update category status.';
        this.toastService.error(errorMsg);
      }
    });
  }
}
