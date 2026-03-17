import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
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
}
