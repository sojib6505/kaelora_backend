console.log('DEBUG TO:', process.env.ADMIN_WHATSAPP_NUMBER);
console.log('DEBUG FROM:', process.env.TWILIO_WHATSAPP_NUMBER);
console.log('DEBUG SID:', process.env.TWILIO_SID);

const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);



const sendOrderNotificationToAdmin = async (order) => {
  try {
    const productList = order.items
      .map(item => `- ${item.productName} (x${item.quantity}) — ${item.price} টাকা`)
      .join('\n');

    const addr = order.shippingAddress || {};
    const customerName = addr.name || order.guestEmail || 'N/A';

    const messageBody =
`🛒 *নতুন অর্ডার এসেছে!*

📋 Order ID: ${order._id}
👤 Customer: ${customerName}
📞 Phone: ${addr.phone || 'N/A'}
📍 Address: ${addr.address || ''}, ${addr.city || ''}

🧾 Products:
${productList}

💵 Subtotal: ${order.subtotal} টাকা
🚚 Shipping: ${order.shippingCost} টাকা
💰 Total: ${order.totalAmount} টাকা
💳 Payment: ${order.paymentMethod}
🕒 Time: ${new Date(order.createdAt).toLocaleString('en-BD')}`;

    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.ADMIN_WHATSAPP_NUMBER,
      body: messageBody
    });

    console.log('WhatsApp notification sent:', message.sid);
    return true;
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
    return false;
  }
};

module.exports = sendOrderNotificationToAdmin;