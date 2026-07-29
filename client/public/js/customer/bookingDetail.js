import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, statusBadge } from '../components/helpers.js';

function row(label, val) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${val}</span></div>`;
}

// ── Active polling handle ──────────────────────────────────────
let _pollTimer = null;
function stopPolling() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

export default {
  async render(el, params) {
    stopPolling(); // clear any previous poll
    setPageTitle('Booking Detail');
    el.innerHTML = `<div class="page-spinner" style="min-height:300px"><div class="spinner"></div></div>`;
    try {
      const { booking, details, tickets, payments } = await api.bookings.detail(params.id);
      setPageTitle(booking.booking_code);
      const payment = payments[0] || null;

      el.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <div class="breadcrumb"><a href="#/my-bookings">My Bookings</a><span class="breadcrumb-sep">/</span><span>${booking.booking_code}</span></div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px">
              <h2 style="font-family:var(--font-mono);letter-spacing:-.01em">${booking.booking_code}</h2>
              ${statusBadge(booking.status)}
            </div>
          </div>
          <div class="page-header-actions">
            ${['pending','confirmed'].includes(booking.status)
              ? `<button class="btn btn-danger btn-sm" id="cancel-btn">Cancel Booking</button>` : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start">
          <!-- LEFT -->
          <div>
            <!-- Booking info -->
            <div class="card" style="margin-bottom:14px">
              <div class="card-header"><span class="card-title">Booking Info</span>${statusBadge(booking.payment_status)}</div>
              ${row('Attraction',  `<strong>${booking.attraction_name}</strong>`)}
              ${row('Location',    booking.attraction_city || '—')}
              ${row('Visit Date',  `<strong style="color:var(--accent)">${formatDate(booking.visit_date)}</strong>`)}
              ${row('Hours',       `${booking.open_time || '—'} – ${booking.close_time || '—'}`)}
              ${row('Booked On',   formatDate(booking.created_at, {dateStyle:'medium'}))}
              ${booking.promo_code ? row('Promo', `<span style="font-family:var(--font-mono);background:var(--accent-subtle);color:var(--accent);padding:2px 7px;border-radius:4px;border:1px solid var(--accent-border);font-size:.8rem;font-weight:600">${booking.promo_code}</span>`) : ''}
            </div>

            <!-- Order items -->
            <div class="card" style="margin-bottom:14px">
              <div class="card-header"><span class="card-title">Order Items</span></div>
              ${details.map(d => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-subtle);gap:12px">
                  <div>
                    <div style="font-weight:600;font-size:.875rem">${d.ticket_type_name}</div>
                    <div style="font-size:.75rem;color:var(--text-tertiary)">${formatIDR(d.unit_price)} × ${d.quantity}</div>
                  </div>
                  <span style="font-weight:700">${formatIDR(d.subtotal)}</span>
                </div>`).join('')}
              <div style="padding-top:10px">
                <div class="info-row" style="font-size:.8125rem"><span style="color:var(--text-tertiary)">Subtotal</span><span>${formatIDR(booking.subtotal)}</span></div>
                ${parseFloat(booking.discount_amount) > 0
                  ? `<div class="info-row" style="font-size:.8125rem;color:var(--success)"><span>Discount</span><span style="font-weight:700">− ${formatIDR(booking.discount_amount)}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:6px;border-top:1px solid var(--border)">
                  <span style="font-size:1rem;font-weight:700">Total</span>
                  <span style="font-size:1.25rem;font-weight:800;color:var(--accent)">${formatIDR(booking.total_amount)}</span>
                </div>
              </div>
            </div>

            <!-- PAYMENT PANEL -->
            <div class="card" id="payment-panel">
              <div class="card-header"><span class="card-title">Payment</span></div>
              <div id="payment-body">
                <div class="page-spinner" style="padding:32px"><div class="spinner spinner-sm"></div></div>
              </div>
            </div>
          </div>

          <!-- RIGHT: tickets -->
          <div>
            <div class="card" style="position:sticky;top:76px">
              <div class="card-header">
                <span class="card-title">Your Tickets</span>
                <span class="badge badge-gray">${tickets.length}</span>
              </div>
              <div id="tickets-panel">
                ${renderTickets(tickets)}
              </div>
            </div>
          </div>
        </div>`;

      // Cancel booking
      document.getElementById('cancel-btn')?.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title:'Cancel booking?', message:'All tickets will be cancelled.', okText:'Yes, Cancel', okClass:'btn-danger' })) return;
        try { await api.bookings.cancel(booking.id); window.toast.success('Booking cancelled.'); window.location.reload(); }
        catch (err) { window.toast.error('Error', err.message); }
      });

      // Load payment UI
      if (payment) {
        await this.renderPaymentPanel(payment, booking);
      } else {
        document.getElementById('payment-body').innerHTML =
          `<div class="empty-state" style="padding:24px"><span class="empty-icon" style="font-size:2rem">💳</span><div class="empty-title">No payment record</div></div>`;
      }

    } catch (err) {
      el.innerHTML = `<div class="empty-state" style="padding:80px 20px"><span class="empty-icon">⚠️</span><div class="empty-title">${err.message}</div><a href="#/my-bookings" class="btn btn-secondary">← Back</a></div>`;
    }
  },

  async renderPaymentPanel(payment, booking) {
    const body = document.getElementById('payment-body');

    // Already paid
    if (payment.status === 'paid') {
      body.innerHTML = paidUI(payment);
      return;
    }

    // Show QRIS — fetch/generate QR
    body.innerHTML = `
      <div style="text-align:center;padding:12px 0 20px">
        <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;padding:6px 14px;background:var(--bg-secondary);border-radius:var(--radius-full);font-size:.8125rem;font-weight:500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/></svg>
          Pay with QRIS
        </div>

        <div id="qr-area">
          <div class="spinner" style="margin:32px auto"></div>
        </div>

        <div id="qr-meta" style="margin-top:12px"></div>
        <div id="expiry-area" style="margin-top:8px"></div>

        <div style="margin-top:20px;padding:14px;background:var(--bg-secondary);border-radius:var(--radius);text-align:left">
          <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">How to pay</div>
          ${['Open your banking / e-wallet app (GoPay, OVO, Dana, BCA, BRI, Mandiri, etc.)',
             'Tap <strong>Scan QR</strong> or <strong>Pay with QRIS</strong>',
             'Scan the QR code above',
             'Confirm the payment in your app',
             'This page updates automatically when payment is received'].map((s,i) =>
            `<div style="display:flex;gap:10px;margin-bottom:6px;font-size:.8125rem;color:var(--text-secondary)">
              <span style="width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">${i+1}</span>
              <span>${s}</span>
            </div>`).join('')}
        </div>

        <div id="status-indicator" style="margin-top:16px"></div>

        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary" id="check-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Check Payment
          </button>
          ${process.env.NODE_ENV !== 'production'
            ? `<button class="btn btn-secondary btn-sm" id="sim-btn" title="Simulate payment (sandbox only)" style="color:var(--text-tertiary)">🔧 Simulate Pay</button>` : ''}
        </div>
        <p style="font-size:.72rem;color:var(--text-tertiary);margin-top:8px" id="auto-check-label">Checking automatically every 5 seconds…</p>
      </div>`;

    // Load QR
    try {
      const qrRes = await api.payments.createQris(payment.id);
      this.showQR(qrRes, payment);
      this.startPolling(payment.id, booking.id);
    } catch (err) {
      document.getElementById('qr-area').innerHTML =
        `<div style="padding:20px;background:var(--danger-bg);border-radius:var(--radius);font-size:.875rem;color:var(--danger)">${err.message}</div>`;
    }

    document.getElementById('check-btn')?.addEventListener('click', () => this.checkPayment(payment.id, booking.id, true));
    document.getElementById('sim-btn')?.addEventListener('click',   () => this.simulatePay(payment.id));
  },

  showQR(qrRes, payment) {
    const area = document.getElementById('qr-area');
    const meta = document.getElementById('qr-meta');
    if (!area) return;

    // QR image (data-url or remote URL from Midtrans)
    area.innerHTML = `
      <div style="display:inline-block;padding:12px;background:#fff;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);border:1px solid var(--border)">
        <img src="${qrRes.qrImageUrl}"
          style="width:200px;height:200px;display:block;border-radius:var(--radius-sm)"
          alt="QRIS Payment QR Code" />
      </div>
      <div style="margin-top:10px;font-size:.72rem;color:var(--text-tertiary)">
        ${qrRes.source === 'midtrans' ? '🔒 Secured by Midtrans' : '🔧 Sandbox Mode'}
      </div>`;

    meta.innerHTML = `
      <div style="font-weight:700;font-size:1.25rem;color:var(--text-primary)">${formatIDR(payment.amount)}</div>
      <div style="font-size:.75rem;color:var(--text-tertiary);font-family:var(--font-mono)">${payment.payment_code}</div>`;

    // Countdown timer
    if (qrRes.expiryTime) {
      this.startCountdown(new Date(qrRes.expiryTime));
    }
  },

  startCountdown(expiryDate) {
    const el = document.getElementById('expiry-area');
    if (!el) return;
    const tick = () => {
      if (!document.getElementById('expiry-area')) return;
      const diff = Math.max(0, expiryDate - Date.now());
      if (diff === 0) {
        el.innerHTML = `<span style="color:var(--danger);font-size:.8rem;font-weight:600">⏰ QR expired — refresh to get a new one</span>`;
        stopPolling(); return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const color = diff < 120000 ? 'var(--danger)' : 'var(--text-tertiary)';
      el.innerHTML = `<span style="font-size:.78rem;color:${color}">⏱ Expires in ${m}:${String(s).padStart(2,'0')}</span>`;
      setTimeout(tick, 1000);
    };
    tick();
  },

  startPolling(paymentId, bookingId) {
    stopPolling();
    let attempts = 0;
    _pollTimer = setInterval(async () => {
      attempts++;
      if (attempts > 180) { stopPolling(); return; } // stop after 15 min
      await this.checkPayment(paymentId, bookingId, false);
    }, 5000);
  },

  async checkPayment(paymentId, bookingId, manual = false) {
    try {
      const res = await api.payments.checkStatus(paymentId);

      if (res.status === 'paid') {
        stopPolling();
        // Reload the page to show confirmed state + tickets
        window.toast.success('Payment confirmed! 🎉', 'Your tickets are ready.');
        setTimeout(() => window.location.reload(), 1200);
        return;
      }

      if (res.status === 'failed') {
        stopPolling();
        const ind = document.getElementById('status-indicator');
        if (ind) ind.innerHTML = `<div style="padding:10px 14px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius);font-size:.875rem;color:var(--danger)">❌ Payment failed or expired. Please cancel and re-book.</div>`;
        return;
      }

      if (manual) {
        const ind = document.getElementById('status-indicator');
        if (ind) {
          ind.innerHTML = `<span style="font-size:.78rem;color:var(--text-tertiary)">Status: ${res.mtStatus || res.status} — still waiting…</span>`;
          setTimeout(() => { if (ind.isConnected) ind.innerHTML = ''; }, 3000);
        }
      }
    } catch (_) { /* ignore poll errors */ }
  },

  async simulatePay(paymentId) {
    const btn = document.getElementById('sim-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    try {
      await api.payments.confirmSim(paymentId);
      stopPolling();
      window.toast.success('Simulated payment success! 🎉', 'Booking confirmed.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      window.toast.error('Simulation failed', err.message);
      if (btn) { btn.disabled = false; btn.textContent = '🔧 Simulate Pay'; }
    }
  },
};

function paidUI(payment) {
  return `
    <div style="text-align:center;padding:24px">
      <div style="width:56px;height:56px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="font-size:1.0625rem;font-weight:700;color:var(--success);margin-bottom:6px">Payment Confirmed</div>
      <div style="font-size:.875rem;color:var(--text-secondary);margin-bottom:16px">Your tickets are active and ready to use.</div>
      ${row('Payment Code', `<span style="font-family:var(--font-mono);font-size:.8rem">${payment.payment_code}</span>`)}
      ${row('Amount',       formatIDR(payment.amount))}
      ${row('Method',       payment.method?.toUpperCase() || 'QRIS')}
      ${payment.paid_at    ? row('Paid At', formatDate(payment.paid_at, {dateStyle:'medium',timeStyle:'short'})) : ''}
    </div>`;
}

function renderTickets(tickets) {
  if (!tickets.length)
    return `<div class="empty-state" style="padding:24px"><span class="empty-icon" style="font-size:2rem">🎫</span><div class="empty-title">No tickets yet</div></div>`;

  return tickets.map(t => `
    <div style="border:1px solid ${t.status==='active'?'var(--accent-border)':'var(--border)'};border-radius:var(--radius-lg);overflow:hidden;margin-bottom:12px">
      <div style="background:${t.status==='active'?'var(--accent-subtle)':'var(--bg-secondary)'};padding:10px 14px;border-bottom:1px dashed var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-family:var(--font-mono);font-size:.7rem;font-weight:600;color:var(--text-secondary)">${t.ticket_code}</span>
          <span class="badge ${t.status==='active'?'badge-success badge-dot':'badge-gray badge-dot'}">${t.status}</span>
        </div>
        <div style="font-size:.75rem;color:var(--text-tertiary);margin-top:2px">${t.ticket_type_name}</div>
      </div>
      ${t.qr_code ? `
        <div style="padding:12px;text-align:center">
          <img src="${t.qr_code}" loading="lazy"
            style="width:100%;max-width:160px;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:zoom-in"
            alt="Ticket QR" onclick="window.open('${t.qr_code}')" />
        </div>
        <div style="padding:0 12px 12px;display:flex;gap:6px">
          <a href="${t.qr_code}" download="ticket-${t.ticket_code}.png"
            class="btn btn-secondary btn-sm" style="flex:1;justify-content:center">⬇ Save</a>
          <button class="btn btn-ghost btn-sm" onclick="printTicket('${t.ticket_code}','${t.qr_code}')" style="flex-shrink:0">🖨️</button>
        </div>` : `<div style="padding:12px;text-align:center;font-size:.8rem;color:var(--text-tertiary)">Ticket available after payment</div>`}
    </div>`).join('');
}

// Global print helper
window.printTicket = (code, qr) => {
  const w = window.open('', '_blank', 'width=480,height=680');
  w.document.write(`<!DOCTYPE html><html><head><title>Ticket ${code}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;padding:32px;text-align:center;background:#fff;color:#0f172a}
    .logo{font-size:1.1rem;font-weight:800;margin-bottom:4px}.sub{font-size:.75rem;color:#64748b;margin-bottom:20px}
    .code{font-family:monospace;font-size:.9rem;font-weight:700;background:#f1f5f9;padding:5px 12px;border-radius:6px;margin:12px auto;display:inline-block}
    img{width:210px;height:210px;border-radius:8px;margin:16px auto;display:block;border:1px solid #e2e8f0}
    hr{border:none;border-top:1px dashed #e2e8f0;margin:16px 0}
    .notice{font-size:.72rem;color:#94a3b8;line-height:1.6}</style></head>
    <body><div class="logo">🎫 WisataPass</div><div class="sub">Official Entrance Ticket</div>
    <hr><div class="code">${code}</div>
    <img src="${qr}" alt="QR Code" />
    <hr><div class="notice">Present this QR at the entrance.<br>Valid for one-time use only.</div>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
};
