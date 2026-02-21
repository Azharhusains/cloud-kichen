import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../services/inventory.service';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { InventoryDialogComponent } from './inventory-dialog.component';

interface InventoryItem {
  itemName: string;
  quantity: number;
  unit: string;
  minStockLevel?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule
  ],
  templateUrl: './inventory-management.component.html',
  styleUrls: ['./inventory-management.component.scss']
})
export class InventoryManagementComponent implements OnInit {
  inventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];
  searchTerm: string = '';

  constructor(
    private inventoryService: InventoryService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.inventoryService.getInventory().subscribe({
      next: (items) => {
        this.inventory = items;
        this.filteredInventory = [...this.inventory];
        this.filterInventory();
      },
      error: (error) => {
        console.error('Error loading inventory:', error);
      }
    });
  }

  filterInventory(): void {
    if (!this.searchTerm) {
      this.filteredInventory = [...this.inventory];
    } else {
      const search = this.searchTerm.toLowerCase();
      this.filteredInventory = this.inventory.filter(item =>
        item.itemName.toLowerCase().includes(search)
      );
    }
  }

  showAddForm(): void {
    const dialogRef = this.dialog.open(InventoryDialogComponent, {
      width: '500px',
      data: {
        editingItem: null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.updateInventory([result]).subscribe({
          next: () => {
            this.loadInventory();
          },
          error: (error) => {
            console.error('Error adding inventory:', error);
          }
        });
      }
    });
  }

  editItem(item: InventoryItem): void {
    const dialogRef = this.dialog.open(InventoryDialogComponent, {
      width: '500px',
      data: {
        editingItem: item
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updatedItem: InventoryItem = {
          ...item,
          ...result
        };
        this.inventoryService.updateInventory([updatedItem]).subscribe({
          next: () => {
            this.loadInventory();
          },
          error: (error) => {
            console.error('Error updating inventory:', error);
          }
        });
      }
    });
  }

  deleteItem(item: InventoryItem): void {
    if (confirm(`Are you sure you want to delete ${item.itemName}?`)) {
      console.log('Delete item:', item);
    }
  }

  toggleActive(item: InventoryItem): void {
    const previousState = item.isActive;
    item.isActive = !item.isActive;
    
    this.inventoryService.updateInventory([item]).subscribe({
      next: () => {
        console.log('Active status updated:', item);
      },
      error: (error) => {
        console.error('Error updating active status:', error);
        // Revert the change if there's an error
        item.isActive = previousState;
      }
    });
  }

  getStockPercentage(quantity: number): number {
    const maxStock = 100;
    return Math.min((quantity / maxStock) * 100, 100);
  }

  getStockColor(quantity: number): string {
    if (quantity <= 0) {
      return 'warn';
    } else if (quantity < 20) {
      return 'warn';
    } else if (quantity < 50) {
      return 'accent';
    } else {
      return 'primary';
    }
  }

  getStockStatus(quantity: number): string {
    if (quantity <= 0) {
      return 'Out of Stock';
    } else if (quantity < 20) {
      return 'Critical';
    } else if (quantity < 50) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  }

  getStockClass(quantity: number): string {
    if (quantity <= 0) {
      return 'stock-out';
    } else if (quantity < 20) {
      return 'stock-critical';
    } else if (quantity < 50) {
      return 'stock-low';
    } else {
      return 'stock-good';
    }
  }
}
