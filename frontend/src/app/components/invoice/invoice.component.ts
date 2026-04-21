import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { OrderService } from '../../services/order.service';
import { MatCardModule } from "@angular/material/card"
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ToastService } from '../../services/toast.service';

@Component({
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss']
})
export class InvoiceComponent implements OnInit, AfterViewInit {
  invoiceData: any = null;
  loading = true;
  @ViewChild('invoiceContent') invoiceContent!: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<InvoiceComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orderId: string },
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadInvoice();
  }

  ngAfterViewInit(): void {
    // Ensure content is rendered before PDF
    setTimeout(() => {
      this.loading = false;
    }, 300);
  }

  loadInvoice(): void {
    this.orderService.getInvoice(this.data.orderId).subscribe({
      next: (data) => {
        this.invoiceData = data;
        console.log('data', data);
        this.loading = false;
      },
      error: (err) => {
        this.toastService.error('Failed to load invoice');
        this.dialogRef.close();
        this.loading = false;
      }
    });
  }

  downloadPDF(): void {
    const element = this.invoiceContent.nativeElement;
    
    // Perfect non-stretched A4 PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 6; // Reduced from 10mm → +30px width
    const contentWidth = pdfWidth - 2 * margin; // Now ~200mm wide
    const contentHeight = pdfHeight - 2 * margin;
    
    html2canvas(element, {
      scale: 1.3, // Crisp but not oversized
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.height / imgProps.width;
      let imgHeight = contentWidth * imgRatio;
      
      // Fit to page if too tall
      if (imgHeight > contentHeight) {
        imgHeight = contentHeight;
      }
      
      const imgWidth = imgHeight / imgRatio;
      
      // CENTER ALIGN - Calculate exact position
      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(
        imgData, 
        'PNG', 
        xPos, 
        yPos, 
        imgWidth, 
        imgHeight
      );
      
      pdf.save(`invoice-${this.invoiceData?.orderNumber || 'order'}.pdf`);
      this.toastService.success('Invoice downloaded perfectly!');
    }).catch((err) => {
      console.error('PDF error:', err);
      this.toastService.error('Failed to generate PDF');
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'received': return 'check_circle';
      case 'preparing': return 'restaurant';
      case 'ready': return 'takeout_dining';
      case 'delivered': return 'delivery_dining';
      case 'completed': return 'event_available';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getSubOrderStatusText(status: string): string {
    switch (status) {
      case 'received': return 'Received';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getItemDisplayPrice(item: any): number {
    if (item.quantityType === 'HALF' && item.menuItem?.halfPrice) {
      return item.menuItem.halfPrice;
    }
    return item.menuItem?.fullPrice || item.menuItem?.price || item.price || 0;
  }

  getPortionLabel(item: any): string {
    return item.quantityType === 'HALF' ? '(Half)' : '';
  }

  getSubtotal(): number {
    if (!this.invoiceData) return 0;
    
    // If we have sub orders, sum all non-cancelled sub order subtotals
    if (this.invoiceData.subOrders && this.invoiceData.subOrders.length > 0) {
      return this.invoiceData.subOrders
        .filter((subOrder: any) => !subOrder.isCancelled)
        .reduce((sum: number, subOrder: any) => sum + (subOrder.subtotal || 0), 0);
    }
    
    // Fallback to legacy field
    return typeof this.invoiceData.subtotal === 'number' ? this.invoiceData.subtotal : 0;
  }

  getDeliveryCharge(): number {
    if (!this.invoiceData) return 0;
    return typeof this.invoiceData.deliveryCharge === 'number' ? this.invoiceData.deliveryCharge : 0;
  }

  getTaxAmount(): number {
    if (!this.invoiceData) return 0;
    
    // If we have sub orders, sum all non-cancelled sub order tax amounts
    if (this.invoiceData.subOrders && this.invoiceData.subOrders.length > 0) {
      return this.invoiceData.subOrders
        .filter((subOrder: any) => !subOrder.isCancelled)
        .reduce((sum: number, subOrder: any) => sum + (subOrder.taxAmount || 0), 0);
    }
    
    // Fallback to legacy field
    return typeof this.invoiceData.taxAmount === 'number' ? this.invoiceData.taxAmount : 0;
  }

  getTaxRate(): number {
    if (!this.invoiceData) return 0;
    const taxRate = this.invoiceData.taxRate;
    return typeof taxRate === 'number' ? (taxRate * 100) : 5; // Default to 5% if not set
  }

  getTotalAmount(): number {
    if (!this.invoiceData) return 0;
    
    // If we have sub orders, sum all non-cancelled sub order totals plus delivery charge
    if (this.invoiceData.subOrders && this.invoiceData.subOrders.length > 0) {
      const subOrdersTotal = this.invoiceData.subOrders
        .filter((subOrder: any) => !subOrder.isCancelled)
        .reduce((sum: number, subOrder: any) => sum + (subOrder.totalAmount || 0), 0);
      
      // For dine-in orders, delivery charge is already included in main order total
      if (this.invoiceData.orderType === 'dine-in') {
        return subOrdersTotal;
      }
      
      return subOrdersTotal + this.getDeliveryCharge();
    }
    
    // Fallback to legacy field
    return typeof this.invoiceData.totalAmount === 'number' ? this.invoiceData.totalAmount : 0;
  }

  hasPriceBreakdown(): boolean {
    if (!this.invoiceData) return false;
    // Check if price-related properties exist and are valid numbers
    const subtotal = this.invoiceData.subtotal;
    const deliveryCharge = this.invoiceData.deliveryCharge;
    const taxAmount = this.invoiceData.taxAmount;
    const totalAmount = this.invoiceData.totalAmount;
    
    return (
      typeof subtotal === 'number' && 
      typeof deliveryCharge === 'number' && 
      typeof taxAmount === 'number' &&
      typeof totalAmount === 'number' &&
      subtotal > 0
    );
  }
}
