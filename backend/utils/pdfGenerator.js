const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

const RESTAURANT_INFO = {
  name: 'CLOUD KITCHEN',
  gstin: '27ABCDE1234F1Z5',
  address: '123 Gourmet Street, Food City, FC 400001'
};

// ================= BILLING ENGINE =================
function calculateBill(order) {
  let subtotal = 0;

  const items = order.items.map(item => {
    const basePrice =
      item.selectedVariant === 'half'
        ? item.halfPrice
        : item.fullPrice || item.price;

    const total = basePrice * item.quantity;
    subtotal += total;

    return {
      name: item.menuItem?.name || item.name,
      variant: item.selectedVariant || 'full',
      price: basePrice,
      quantity: item.quantity,
      total
    };
  });

  const gstRate = 0.05;
  const gstAmount = subtotal * gstRate;

  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  const delivery = order.deliveryCharge || 0;
  const packing = order.packingCharge || 0;
  const discount = order.discount || 0;

  const totalAmount = subtotal + gstAmount + delivery + packing - discount;

  return {
    items,
    subtotal,
    cgst,
    sgst,
    delivery,
    packing,
    discount,
    totalAmount
  };
}

// ================= PDF GENERATOR =================
async function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    // FIX 1: Explicitly set a smaller bottom margin so the footer doesn't trigger a page break
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 40, left: 40, right: 40, bottom: 15 } 
    });
    
    const chunks = [];

    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#8B6914';
    const gray = '#777';
    const light = '#f6f6f6';

    // FIX 3: Replaced '₹' with 'Rs. ' to prevent the PDFKit Helvetica font encoding glitch (the ¹ symbol)
    const format = n => `Rs. ${Number(n || 0).toFixed(2)}`;

    const bill = calculateBill(order);

    let y = 0;
    const pageHeight = 842;
    const bottomLimit = 680;

    // ===== HEADER =====
    const drawHeader = () => {
      doc.rect(0, 0, 595, 90).fill(primary);

      doc.fillColor('#fff')
        .fontSize(18)
        .text('🌙 CLOUD KITCHEN', 40, 30);

      doc.roundedRect(400, 30, 140, 25, 12).fill('#fff');
      doc.fillColor(primary)
        .fontSize(10)
        .text('ORDER CONFIRMED', 400, 36, {
          width: 140,
          align: 'center'
        });

      y = 110;
    };

    // ===== FOOTER =====
    const drawFooter = () => {
      doc.moveTo(40, pageHeight - 80)
        .lineTo(555, pageHeight - 80)
        .strokeColor('#eee')
        .stroke();

      doc.fillColor(gray).fontSize(9)
        .text(RESTAURANT_INFO.name, 40, pageHeight - 70)
        .text(RESTAURANT_INFO.address, 40, pageHeight - 55)
        .text(`GSTIN: ${RESTAURANT_INFO.gstin}`, 40, pageHeight - 40);

      doc.text('Thank you for your order ❤️', 350, pageHeight - 60, {
        width: 200,
        align: 'right'
      });
    };

    const addPage = () => {
      doc.addPage();
      drawHeader();
      drawFooter();
    };

    // INIT
    drawHeader();
    drawFooter();

    // ===== ORDER INFO =====
    doc.fillColor('#000').fontSize(16)
      .text(`Order #${order.orderNumber}`, 40, y);

    doc.fillColor(gray).fontSize(10)
      .text(new Date(order.createdAt).toLocaleString('en-IN'), 40, y + 20);

    y += 50;

    doc.fillColor('#000')
      .text(`Customer: ${order.user?.name || 'Customer'}`, 40, y);

    doc.fillColor(gray)
      .text(`Payment: ${order.paymentMethod}`, 40, y + 15);

    y += 40;

    // ===== TABLE HEADER =====
    const drawTableHeader = () => {
      doc.fillColor(light)
        .rect(40, y, 515, 25)
        .fill();

      // FIX 2: Added explicit width and matching X coordinates for perfect right-alignment
      doc.fillColor('#000').fontSize(11)
        .text('Item', 50, y + 7)
        .text('Qty', 300, y + 7)
        .text('Total', 400, y + 7, { width: 140, align: 'right' });

      y += 30;
    };

    drawTableHeader();

    const rowHeight = 24;

    // ===== ITEMS =====
    bill.items.forEach((item, index) => {

      if (y + rowHeight > bottomLimit) {
        addPage();
        drawTableHeader();
      }

      const name =
        item.name.length > 30
          ? item.name.substring(0, 30) + '...'
          : item.name;

      if (index % 2 === 0) {
        doc.rect(40, y - 4, 515, rowHeight).fill('#fafafa');
      }

      doc.fillColor('#000').fontSize(10)
        .text(`${name} (${item.variant.toUpperCase()})`, 50, y, { width: 240 });

      doc.fillColor(gray)
        .text(`x${item.quantity}`, 300, y);

      // FIX 2: Standardized X and width to keep prices inside the table bounds
      doc.fillColor('#000')
        .text(format(item.total), 400, y, { width: 140, align: 'right' });

      y += rowHeight;
    });

    // ===== LAST PAGE CHECK =====
    if (y > bottomLimit - 140) {
      addPage();
    }

    // ===== BILL SUMMARY =====
    y += 20;
    const startX = 300;

    const drawLine = (label, value, bold = false, color = '#000') => {
      doc.fillColor(color)
        .fontSize(bold ? 12 : 10)
        .text(label, startX, y);

      // FIX 2: Standardized X and width for the summary values too
      doc.text(value, 400, y, { width: 140, align: 'right' });

      y += 18;
    };

    drawLine('Subtotal', format(bill.subtotal));
    drawLine('CGST (2.5%)', format(bill.cgst));
    drawLine('SGST (2.5%)', format(bill.sgst));

    if (bill.packing) {
      drawLine('Packing Charges', format(bill.packing));
    }

    if (bill.delivery) {
      drawLine('Delivery Charges', format(bill.delivery));
    }

    if (bill.discount) {
      drawLine('Discount', `- ${format(bill.discount)}`, false, 'green');
    }

    // Slightly shortened stroke to match the alignment
    doc.moveTo(startX, y).lineTo(540, y).strokeColor('#ccc').stroke();
    y += 8;

    drawLine('TOTAL', format(bill.totalAmount), true, primary);

    doc.end();
  });
}

async function savePDFToFile(pdfBuffer, orderNumber) {
  const fileName = `Invoice_#${orderNumber}.pdf`;
  const dir = path.join(__dirname, '..', 'uploads', 'invoices');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, pdfBuffer);
  return filePath;
}

module.exports = { generateInvoicePDF, savePDFToFile };