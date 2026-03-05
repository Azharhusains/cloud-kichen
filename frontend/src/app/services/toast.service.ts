import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a toast notification
   * @param message - The message to display
   * @param type - 'success' | 'error' | 'info'
   */
  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const config: MatSnackBarConfig = {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      politeness: 'assertive'
    };

    const snackBarRef = this.snackBar.open(message, 'Close', config);
    
    setTimeout(() => {
      const container = document.querySelector('.mat-mdc-snack-bar-container');
      if (container) {
        const colors: any = {
          success: '#4caf50',
          error: '#f44336',
          info: '#2196f3'
        };
        (container as HTMLElement).style.backgroundColor = colors[type];
        (container as HTMLElement).style.color = '#ffffff';
      }
    }, 0);
  }

  /**
   * Show a success toast (green)
   */
  success(message: string): void {
    this.show(message, 'success');
  }

  /**
   * Show an error toast (red)
   */
  error(message: string): void {
    this.show(message, 'error');
  }

  /**
   * Show an info toast (blue)
   */
  info(message: string): void {
    this.show(message, 'info');
  }

  /**
   * Show a warning toast (orange)
   */
  warning(message: string): void {
    this.show(message, 'info');
  }
}
