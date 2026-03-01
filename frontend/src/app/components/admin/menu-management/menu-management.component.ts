import { Component, OnInit } from '@angular/core';
import { MenuService } from '../../../services/menu.service';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { MenuItemDialogComponent } from './menu-item-dialog.component';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss']
})
export class MenuManagementComponent implements OnInit {
  menuItems: any[] = [];
  filteredItems: any[] = [];
  categories: Category[] = [];
  searchTerm: string = '';

  constructor(
    private menuService: MenuService,
    private categoryService: CategoryService,
    private dialog: MatDialog,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadMenuItems();
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadMenuItems(): void {
    this.menuService.getMenuItems().subscribe({
      next: (response) => {
        this.menuItems = response.menuItems;
        this.filteredItems = response.menuItems;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
      }
    });
  }

  filterItems(): void {
    const searchLower = this.searchTerm.toLowerCase().trim();
    if (searchLower === '') {
      this.filteredItems = this.menuItems;
    } else {
      this.filteredItems = this.menuItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }
  }

  showAddForm(): void {
    const dialogRef = this.dialog.open(MenuItemDialogComponent, {
      width: '600px',
      data: {
        editingItem: null,
        categories: this.categories
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.menuService.createMenuItem(result).subscribe({
          next: () => {
            this.loadMenuItems();
            this.toastService.success('Menu item created successfully!');
          },
          error: (error) => {
            console.error('Error creating item:', error);
            const errorMsg = error.error?.message || 'Error creating menu item';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  editItem(item: any): void {
    const dialogRef = this.dialog.open(MenuItemDialogComponent, {
      width: '600px',
      data: {
        editingItem: item,
        categories: this.categories
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.menuService.updateMenuItem(item._id, result).subscribe({
          next: () => {
            this.loadMenuItems();
            this.toastService.success('Menu item updated successfully!');
          },
          error: (error) => {
            console.error('Error updating item:', error);
            const errorMsg = error.error?.message || 'Error updating menu item';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  deleteItem(item: any): void {
    if (confirm('Are you sure you want to delete this item?')) {
      this.menuService.deleteMenuItem(item._id).subscribe({
        next: () => {
          this.loadMenuItems();
          this.toastService.success('Menu item deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting item:', error);
          const errorMsg = error.error?.message || 'Error deleting menu item';
          this.toastService.error(errorMsg);
        }
      });
    }
  }

  toggleAvailability(item: any): void {
    const updatedItem = { ...item, isAvailable: !item.isAvailable };
    this.menuService.updateMenuItem(item._id, updatedItem).subscribe({
      next: () => {
        this.loadMenuItems();
        this.toastService.success(`Menu item ${updatedItem.isAvailable ? 'available' : 'unavailable'}!`);
      },
      error: (error) => {
        console.error('Error updating availability:', error);
        const errorMsg = error.error?.message || 'Error updating availability';
        this.toastService.error(errorMsg);
      }
    });
  }
}
