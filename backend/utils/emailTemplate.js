const path = require('path');

// ===== SAME BILLING ENGINE (SHARED) =====
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

// ===== EMAIL TEMPLATE =====
function generateOrderConfirmationEmail(orderData, pdfDownloadUrl) {
  const goldColor = '#8B6914';
  const darkGold = '#6B4C0E';

  const bill = calculateBill(orderData);

  const orderDate = new Date(orderData.createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Confirmed</title>

<link href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>

<body style="margin:0;background:#f4f6f8;font-family:'Inter',sans-serif;">

<div style="max-width:680px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg, ${goldColor}, #A68A64);padding:50px 30px;text-align:center;color:#fff;">
    <div style="font-size:42px;">🌙</div>
    <h1 style="font-family:'Crimson Text',serif;font-size:34px;margin:10px 0;">CLOUD KITCHEN</h1>
    <span style="background:#fff;color:${goldColor};padding:8px 18px;border-radius:25px;font-weight:600;">
      ORDER CONFIRMED
    </span>
  </div>

  <!-- BODY -->
  <div style="padding:40px 30px;">

    <div style="text-align:center;margin-bottom:30px;">
      <h2>Order #${orderData.orderNumber}</h2>
      <p style="color:#777;">${orderDate}</p>
    </div>

    <p>
      Hi <strong>${orderData.user?.name || orderData.customerName}</strong>,  
      your order has been successfully placed 🎉
    </p>

    <!-- SUMMARY -->
    <div style="display:flex;gap:15px;margin:25px 0;">
      <div style="flex:1;background:#fafafa;padding:15px;border-radius:10px;">
        <div style="font-size:12px;color:#888;">TOTAL</div>
        <div style="font-size:22px;font-weight:bold;">₹${bill.totalAmount.toFixed(2)}</div>
      </div>
      <div style="flex:1;background:#fafafa;padding:15px;border-radius:10px;">
        <div style="font-size:12px;color:#888;">PAYMENT</div>
        <div style="font-size:16px;font-weight:600;">${orderData.paymentMethod}</div>
      </div>
    </div>

    <!-- ITEMS -->
    <div style="border:1px solid #eee;border-radius:10px;overflow:hidden;">
      <div style="padding:12px 15px;background:#fafafa;font-weight:600;">Order Details</div>

      ${bill.items.map(item => `
        <div style="display:flex;justify-content:space-between;padding:12px 15px;border-top:1px solid #eee;">
          <div>
            ${item.name} <span style="color:#888;font-size:12px;">(${item.variant.toUpperCase()})</span><br>
            <span style="color:#777;font-size:13px;">x${item.quantity}</span>
          </div>
          <div style="font-weight:500;">₹${item.total.toFixed(2)}</div>
        </div>
      `).join('')}
    </div>

    <!-- BILL -->
    <div style="background:#fafafa;padding:20px;border-radius:10px;margin-top:25px;">

      <div style="display:flex;justify-content:space-between;">
        <span>Subtotal</span>
        <span>₹${bill.subtotal.toFixed(2)}</span>
      </div>

      <div style="display:flex;justify-content:space-between;">
        <span>CGST (2.5%)</span>
        <span>₹${bill.cgst.toFixed(2)}</span>
      </div>

      <div style="display:flex;justify-content:space-between;">
        <span>SGST (2.5%)</span>
        <span>₹${bill.sgst.toFixed(2)}</span>
      </div>

      ${bill.packing ? `
      <div style="display:flex;justify-content:space-between;">
        <span>Packing</span>
        <span>₹${bill.packing.toFixed(2)}</span>
      </div>` : ''}

      ${bill.delivery ? `
      <div style="display:flex;justify-content:space-between;">
        <span>Delivery</span>
        <span>₹${bill.delivery.toFixed(2)}</span>
      </div>` : ''}

      ${bill.discount ? `
      <div style="display:flex;justify-content:space-between;color:green;">
        <span>Discount</span>
        <span>-₹${bill.discount.toFixed(2)}</span>
      </div>` : ''}

      <div style="border-top:1px dashed #ccc;margin:10px 0;"></div>

      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;">
        <span>Total</span>
        <span style="color:${goldColor};">₹${bill.totalAmount.toFixed(2)}</span>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="padding:20px;text-align:center;background:#fafafa;font-size:13px;color:#777;">
    Cloud Kitchen<br>
    123 Gourmet Street<br>
    GSTIN: 27ABCDE1234F1Z5
  </div>

</div>
</body>
</html>
`;
}

module.exports = { generateOrderConfirmationEmail };