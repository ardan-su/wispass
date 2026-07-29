/**
 * Midtrans Payment Service
 * Handles QRIS transaction creation, status check, and webhook verification.
 */
const midtransClient = require('midtrans-client');

// ── Snap client (for transaction token / redirect) ────────────
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY,
});

// ── Core API client (for QRIS direct charge + status check) ──
const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Create a QRIS charge transaction.
 * Returns { orderId, qrString, qrImageUrl, expiryTime }
 *
 * @param {Object} opts
 * @param {string} opts.orderId       – unique order ID (payment_code)
 * @param {number} opts.amount        – gross amount in IDR (integer)
 * @param {string} opts.customerName
 * @param {string} opts.customerEmail
 * @param {string} opts.itemName      – booking description
 */
async function createQrisCharge({ orderId, amount, customerName, customerEmail, itemName }) {
  const param = {
    payment_type: 'qris',
    transaction_details: {
      order_id:    orderId,
      gross_amount: Math.round(amount),
    },
    qris: {
      acquirer: 'gopay',  // 'gopay' covers GoPay QRIS — widest acceptance
    },
    customer_details: {
      first_name: customerName || 'Customer',
      email:      customerEmail || 'customer@wisatapass.local',
    },
    item_details: [
      {
        id:       orderId,
        price:    Math.round(amount),
        quantity: 1,
        name:     itemName || 'WisataPass Ticket',
      },
    ],
    // Expire in 15 minutes
    custom_expiry: {
      expiry_duration: 15,
      unit: 'minute',
    },
  };

  const response = await coreApi.charge(param);

  // Midtrans QRIS response contains actions array with QR image URL
  const qrAction = response.actions?.find(a => a.name === 'generate-qr-code');

  return {
    orderId:      response.order_id,
    transactionId: response.transaction_id,
    qrString:     response.qr_string     || null,
    qrImageUrl:   qrAction?.url          || null,
    expiryTime:   response.expiry_time   || null,
    status:       response.transaction_status,
    raw:          response,
  };
}

/**
 * Check transaction status by order_id (= payment_code).
 * Returns Midtrans transaction_status string.
 */
async function checkTransactionStatus(orderId) {
  const response = await coreApi.transaction.status(orderId);
  return {
    orderId:           response.order_id,
    transactionId:     response.transaction_id,
    transactionStatus: response.transaction_status, // pending | settlement | expire | cancel | deny
    fraudStatus:       response.fraud_status,
    settlementTime:    response.settlement_time,
    statusCode:        response.status_code,
    raw:               response,
  };
}

/**
 * Verify a Midtrans webhook notification signature.
 * Midtrans signs with SHA-512 of (orderId + statusCode + grossAmount + serverKey).
 */
function verifyWebhookSignature(notification) {
  const crypto = require('crypto');
  const { order_id, status_code, gross_amount } = notification;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const hash = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');
  return hash === notification.signature_key;
}

/**
 * Determine if a Midtrans status means "paid / settled".
 */
function isSettled(transactionStatus, fraudStatus) {
  if (transactionStatus === 'capture') {
    return fraudStatus === 'accept' || fraudStatus === 'challenge';
  }
  return transactionStatus === 'settlement';
}

/**
 * Cancel / expire a Midtrans transaction.
 */
async function cancelTransaction(orderId) {
  return coreApi.transaction.cancel(orderId);
}

module.exports = {
  snap,
  coreApi,
  createQrisCharge,
  checkTransactionStatus,
  verifyWebhookSignature,
  isSettled,
  cancelTransaction,
};
