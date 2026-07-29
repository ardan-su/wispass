/**
 * QR Service – Enhanced
 * Generates, encrypts, signs, verifies, and exports QR codes.
 */
const QRCode = require('qrcode');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');

const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'wisatapass_qr_secret';
const EXPIRY_HOURS = parseInt(process.env.QR_EXPIRY_HOURS) || 24;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function createHmac(data) {
  return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encryptPayload(payload) {
  const json = JSON.stringify(payload);
  // AES-256-GCM encryption for the payload
  const key  = crypto.scryptSync(QR_SECRET, 'wisatapass-salt', 32);
  const iv   = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

function decryptPayload(encrypted) {
  const buf  = Buffer.from(encrypted, 'base64url');
  const iv   = buf.slice(0, 12);
  const tag  = buf.slice(12, 28);
  const enc  = buf.slice(28);
  const key  = crypto.scryptSync(QR_SECRET, 'wisatapass-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  return JSON.parse(json);
}

// ─── QR GENERATION ────────────────────────────────────────────────────────────

/**
 * Generate a complete QR code record.
 * @param {object} params
 * @param {string} params.generatedBy  – admin user ID
 * @param {string} [params.ticketId]   – ticket ID if linked
 * @param {string} [params.orderId]    – order ID if linked
 * @param {string} [params.siteId]     – tourist site ID
 * @param {string} [params.branchId]   – branch ID
 * @param {string} [params.label]      – optional label
 * @param {number} [params.expiryHours] – override expiry
 * @param {number} [params.maxScans]   – max scans (default 1)
 * @returns {object} QR record ready to INSERT
 */
async function generateQR({
  generatedBy,
  ticketId = null,
  orderId  = null,
  siteId   = null,
  branchId = null,
  label    = null,
  expiryHours = EXPIRY_HOURS,
  maxScans = 1,
} = {}) {
  const qrUuid   = uuid();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + expiryHours * 3_600_000);

  const rawPayload = {
    uuid:      qrUuid,
    ticketId,
    orderId,
    siteId,
    branchId,
    issuedAt:  issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    label,
  };

  const encryptedData  = encryptPayload(rawPayload);
  const payloadHash    = sha256(encryptedData);
  const signature      = createHmac(`${qrUuid}:${payloadHash}:${issuedAt.toISOString()}`);

  // What gets encoded in the actual QR image
  const qrContent = JSON.stringify({
    v:   2,              // version
    id:  qrUuid,
    d:   encryptedData,  // encrypted payload
    h:   payloadHash,    // integrity hash
    s:   signature,      // HMAC signature
    exp: expiresAt.toISOString(),
  });

  const qrImage = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'H',
    type:   'image/png',
    margin: 2,
    width:  512,
    color:  { dark: '#1a1a2e', light: '#ffffff' },
  });

  return {
    id:           uuid(),   // DB primary key
    uuid:         qrUuid,
    ticketId,
    orderId,
    siteId,
    branchId,
    generatedBy,
    qrImage,
    qrData:       qrContent,
    payloadHash,
    signature,
    status:       'active',
    maxScans,
    validFrom:    issuedAt,
    expiresAt,
    notes:        label,
  };
}

// ─── QR VERIFICATION ─────────────────────────────────────────────────────────

/**
 * Verify a scanned QR string.
 * @param {string} qrData  – raw JSON string from QR scanner
 * @param {object} opts
 * @param {string} [opts.expectedSiteId]   – required branch context
 * @param {string} [opts.expectedBranchId] – required branch context
 * @returns {{ valid, payload, reason }}
 */
function verifyQR(qrData, { expectedSiteId, expectedBranchId } = {}) {
  try {
    const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;

    // Version check
    if (parsed.v !== 2) {
      // Fall back to legacy v1 format (original ticket QR)
      return verifyLegacyQR(qrData);
    }

    const { id: qrUuid, d: encryptedData, h: payloadHash, s: signature, exp } = parsed;

    // 1. Signature check
    const expectedSig = createHmac(`${qrUuid}:${payloadHash}:${JSON.parse(
      Buffer.from(encryptedData.split('').slice(0, 0).join('') || '{}').toString()
    )?.issuedAt || ''}`);
    // Verify by re-computing from what we have
    const sigCheck = createHmac(`${qrUuid}:${payloadHash}:${new Date(
      Buffer.from(encryptedData, 'base64url')
        .slice(28).toString('utf8').match(/"issuedAt":"([^"]+)"/)
        ?.[1] || ''
    ).toISOString()}`);
    // Simple signature match
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(createHmac(`${qrUuid}:${sha256(encryptedData)}:${new Date(
        (() => { try { return decryptPayload(encryptedData).issuedAt; } catch { return ''; }})()
      ).toISOString()}`), 'hex')
    )) {
      return { valid: false, reason: 'Invalid QR signature – possible tampering.', payload: null };
    }

    // 2. Integrity check
    if (sha256(encryptedData) !== payloadHash) {
      return { valid: false, reason: 'QR payload integrity check failed.', payload: null };
    }

    // 3. Decrypt
    const payload = decryptPayload(encryptedData);

    // 4. Expiry check
    if (new Date(payload.expiresAt) < new Date()) {
      return { valid: false, reason: `QR expired at ${payload.expiresAt}.`, payload, expired: true };
    }

    // 5. Branch/site check
    if (expectedSiteId && payload.siteId && payload.siteId !== expectedSiteId) {
      return { valid: false, reason: 'QR is for a different tourist site.', payload };
    }
    if (expectedBranchId && payload.branchId && payload.branchId !== expectedBranchId) {
      return { valid: false, reason: 'QR is for a different branch.', payload };
    }

    return { valid: true, payload, reason: null };
  } catch (err) {
    return { valid: false, reason: `QR parse error: ${err.message}`, payload: null };
  }
}

/**
 * Verify legacy v1 QR (original ticket QRs)
 */
function verifyLegacyQR(qrData) {
  try {
    const payload = JSON.parse(qrData);
    const { sig, ...rest } = payload;
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || QR_SECRET);
    hmac.update(JSON.stringify(rest));
    const expected = hmac.digest('hex');
    if (sig !== expected) {
      return { valid: false, reason: 'Legacy QR signature invalid.', payload: null };
    }
    return { valid: true, payload: rest, legacy: true };
  } catch {
    return { valid: false, reason: 'QR data could not be parsed.', payload: null };
  }
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────

/**
 * Get PNG buffer from base64 data URL
 */
function getQRPngBuffer(base64DataUrl) {
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

/**
 * Generate printable HTML for a QR code (for PDF rendering via browser print)
 */
function generateQRHtml(qrRecord, siteInfo = {}) {
  const expiry = qrRecord.expires_at
    ? new Date(qrRecord.expires_at).toLocaleString('id-ID')
    : 'N/A';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WisataPass QR Code</title>
  <style>
    body { font-family: 'Inter', sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; background:#f5f5f5; }
    .card { background:#fff; padding:32px; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,.12); text-align:center; max-width:400px; width:100%; }
    .logo { font-size:24px; font-weight:800; color:#2563eb; margin-bottom:8px; }
    .site-name { font-size:16px; color:#374151; margin-bottom:4px; }
    .branch { font-size:13px; color:#6b7280; margin-bottom:24px; }
    img { width:280px; height:280px; border:3px solid #e5e7eb; border-radius:12px; }
    .uuid { font-family:monospace; font-size:11px; color:#9ca3af; margin-top:16px; word-break:break-all; }
    .expiry { font-size:13px; color:#dc2626; margin-top:8px; }
    .footer { font-size:11px; color:#9ca3af; margin-top:16px; }
    @media print { body { background:#fff; } .card { box-shadow:none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🎫 WisataPass</div>
    <div class="site-name">${siteInfo.name || 'Tourist Site'}</div>
    <div class="branch">${siteInfo.branch || ''}</div>
    <img src="${qrRecord.qr_image}" alt="QR Code" />
    <div class="uuid">ID: ${qrRecord.uuid}</div>
    <div class="expiry">Valid until: ${expiry}</div>
    <div class="footer">Scan this QR at the entrance gate</div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateQR,
  verifyQR,
  verifyLegacyQR,
  getQRPngBuffer,
  generateQRHtml,
  // Legacy compat exports
  generateTicketQR: async (ticket) => {
    const payload = {
      ticketId: ticket.id,
      ticketCode: ticket.ticket_code,
      bookingId: ticket.order_id || ticket.booking_id,
      userId: ticket.user_id,
      attractionId: ticket.site_id || ticket.attraction_id,
      visitDate: ticket.visit_date,
      validationToken: ticket.validation_token,
      issuedAt: new Date().toISOString(),
    };
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || QR_SECRET);
    hmac.update(JSON.stringify(payload));
    payload.sig = hmac.digest('hex');
    const qrData = JSON.stringify(payload);
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H', type: 'image/png', margin: 2, width: 400,
      color: { dark: '#1F2937', light: '#FFFFFF' },
    });
    return { qrCode, qrData };
  },
  verifyQRPayload: (qrData, storedToken) => {
    const r = verifyLegacyQR(qrData);
    if (!r.valid) return r;
    if (r.payload?.validationToken !== storedToken) {
      return { valid: false, reason: 'Validation token mismatch.' };
    }
    return { valid: true, payload: r.payload };
  },
};
