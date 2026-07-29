/**
 * QR Code Generation Service
 */
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate a QR code for a ticket.
 * The QR payload is a signed JSON string so the validator can detect tampering.
 *
 * @param {Object} ticket   – ticket record from DB
 * @returns {{ qrCode: string, qrData: string }}
 *   qrCode  – base64 PNG data-URI
 *   qrData  – the JSON string encoded in the QR
 */
async function generateTicketQR(ticket) {
  const payload = {
    ticketId:        ticket.id,
    ticketCode:      ticket.ticket_code,
    bookingId:       ticket.booking_id,
    userId:          ticket.user_id,
    attractionId:    ticket.attraction_id,
    visitDate:       ticket.visit_date,
    validationToken: ticket.validation_token,
    issuedAt:        new Date().toISOString(),
  };

  // HMAC signature to prevent tampering
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
  hmac.update(JSON.stringify(payload));
  payload.sig = hmac.digest('hex');

  const qrData = JSON.stringify(payload);

  const qrCode = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type:    'image/png',
    margin:  2,
    width:   400,
    color:   { dark: '#1F2937', light: '#FFFFFF' },
  });

  return { qrCode, qrData };
}

/**
 * Verify a QR payload matches the stored validation token.
 *
 * @param {string} qrData  – raw string from scanned QR
 * @param {string} storedToken – validation_token from DB
 * @returns {{ valid: boolean, payload?: Object, reason?: string }}
 */
function verifyQRPayload(qrData, storedToken) {
  try {
    const payload = JSON.parse(qrData);
    const { sig, ...rest } = payload;

    // Re-compute signature
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    hmac.update(JSON.stringify(rest));
    const expected = hmac.digest('hex');

    if (sig !== expected) {
      return { valid: false, reason: 'QR signature invalid – possible tampering.' };
    }
    if (rest.validationToken !== storedToken) {
      return { valid: false, reason: 'Validation token mismatch.' };
    }
    return { valid: true, payload: rest };
  } catch (_) {
    return { valid: false, reason: 'QR data could not be parsed.' };
  }
}

module.exports = { generateTicketQR, verifyQRPayload };
