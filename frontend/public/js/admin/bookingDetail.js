import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, statusBadge } from '../components/helpers.js';

function infoRow(label, val) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${val}</span></div>`;
}

export default {
  async render(el, params) {
    setPageTitle('Booking Detail');
    el.innerHTML = `<div class="page-spinner"><div class="spinner"></div></div>`;
    try {
      const { booking, details, tickets, payments } = await api.bookings.detail(params.id);
      setPageTitle(booking.booking_code);

      el.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <div class="breadcrumb"><a href="#/admin/bookings">Bookings</a><span class="breadcrumb-sep">/</span><span>${booking.booking_code}</span></div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h2 style="font-family:var(--font-mono);letter-spacing:-.01em">${booking.booking_code}</h2>
              ${statusBadge(booking.status)}
            </div>
          </div>
          <div class="page-header-actions">
            ${booking.status==='pending'    ? `<button class="btn btn-success"   id="confirm-btn">✓ Confirm</button>` : ''}
            ${booking.status==='confirmed'  ? `<button class="btn btn-secondary" id="complete-btn">Mark Completed</button>` : ''}
            ${['pending','confirmed'].includes(booking.status) ? `<button class="btn btn-danger" id="cancel-btn">Cancel</button>` : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start">
          <div>
            <div class="card" style="margin-bottom:16px">
              <div class="card-header"><span class="card-title">Booking Info</span>${statusBadge(booking.payment_status)}</div>
              ${infoRow('Customer',    booking.customer_name)}
              ${infoRow('Email',       `<a href="mailto:${booking.customer_email}" style="color:var(--accent)">${booking.customer_email}</a>`)}
              ${infoRow('Phone',       booking.customer_phone || '—')}
              ${infoRow('Attraction',  booking.attraction_name)}
              ${infoRow('Location',    booking.attraction_city || '—')}
              ${infoRow('Visit Date',  `<strong>${formatDate(booking.visit_date)}</strong>`)}
              ${infoRow('Opening',     `${booking.open_time || '—'} – ${booking.close_time || '—'}`)}
              ${infoRow('Created',     formatDate(booking.created_at, {dateStyle:'medium',timeStyle:'short'}))}
              ${booking.notes ? infoRow('Notes', booking.notes) : ''}
              ${booking.admin_notes ? infoRow('Admin Notes', `<em style="color:var(--text-tertiary)">${booking.admin_notes}</em>`) : ''}
            </div>

            <div class="card" style="margin-bottom:16px">
              <div class="card-header"><span class="card-title">Order Items</span></div>
              <div class="table-wrapper" style="border:none">
                <table><thead><tr><th>Ticket Type</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                <tbody>
                  ${details.map(d => `<tr>
                    <td style="font-weight:500">${d.ticket_type_name}</td>
                    <td><span class="badge badge-gray">${d.quantity}</span></td>
                    <td>${formatIDR(d.unit_price)}</td>
                    <td style="font-weight:600">${formatIDR(d.subtotal)}</td>
                  </tr>`).join('')}
                </tbody></table>
              </div>
              <div style="padding:12px 16px;border-top:1px solid var(--border-subtle)">
                <div class="info-row"><span class="info-label">Subtotal</span><span>${formatIDR(booking.subtotal)}</span></div>
                ${booking.discount_amount > 0 ? `<div class="info-row"><span class="info-label" style="color:var(--success)">Discount</span><span style="color:var(--success);font-weight:600">− ${formatIDR(booking.discount_amount)}</span></div>` : ''}
                <div class="info-row" style="font-size:1rem;font-weight:700"><span>Total</span><span style="color:var(--accent)">${formatIDR(booking.total_amount)}</span></div>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title">Payment</span></div>
              ${payments.length ? payments.map(p => `
                <div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                    <span style="font-family:var(--font-mono);font-size:.8rem;font-weight:600">${p.payment_code}</span>
                    ${statusBadge(p.status)}
                  </div>
                  ${infoRow('Amount', `<strong>${formatIDR(p.amount)}</strong>`)}
                  ${infoRow('Method', p.method)}
                  ${p.paid_at ? infoRow('Paid At', formatDate(p.paid_at, {dateStyle:'medium',timeStyle:'short'})) : ''}
                  ${p.proof_image ? `<img src="${p.proof_image}" loading="lazy" style="max-height:140px;border-radius:var(--radius-sm);margin-top:10px;border:1px solid var(--border)" alt="Payment proof" />` : ''}
                  ${p.status==='pending' ? `
                    <div style="display:flex;gap:8px;margin-top:12px">
                      <button class="btn btn-success btn-sm confirm-pay-btn" data-pid="${p.id}">✓ Confirm Payment</button>
                      <button class="btn btn-danger  btn-sm reject-pay-btn"  data-pid="${p.id}">✕ Reject</button>
                    </div>` : ''}
                </div>`).join('')
              : `<div class="empty-state" style="padding:24px"><span class="empty-icon">💳</span><div class="empty-title">No payment recorded</div></div>`}
            </div>
          </div>

          <div>
            <div class="card">
              <div class="card-header"><span class="card-title">Tickets <span class="badge badge-gray" style="margin-left:4px">${tickets.length}</span></span></div>
              ${tickets.map(t => `
                <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap">
                    <span style="font-family:var(--font-mono);font-size:.72rem;font-weight:600;color:var(--text-tertiary)">${t.ticket_code}</span>
                    ${statusBadge(t.status)}
                  </div>
                  <div style="font-size:.78rem;color:var(--text-tertiary);margin-bottom:8px">${t.ticket_type_name}</div>
                  ${t.qr_code ? `<img src="${t.qr_code}" loading="lazy" style="width:100%;border-radius:var(--radius-sm);border:1px solid var(--border)" alt="QR Code" />` : ''}
                </div>`).join('')}
            </div>
          </div>
        </div>`;

      document.getElementById('confirm-btn')?.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title:'Confirm booking?', okText:'Confirm', okClass:'btn-success', icon:'✅' })) return;
        await api.bookings.confirm(booking.id); window.toast.success('Booking confirmed!'); window.location.reload();
      });
      document.getElementById('cancel-btn')?.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title:'Cancel booking?', message:'All tickets will be cancelled.', okText:'Cancel Booking', okClass:'btn-danger' })) return;
        await api.bookings.cancel(booking.id); window.toast.success('Booking cancelled.'); window.location.reload();
      });
      document.getElementById('complete-btn')?.addEventListener('click', async () => {
        await api.bookings.complete(booking.id); window.toast.success('Marked as completed.'); window.location.reload();
      });
      document.querySelectorAll('.confirm-pay-btn').forEach(btn => btn.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title:'Confirm payment?', okText:'Confirm', okClass:'btn-success', icon:'✅' })) return;
        await api.payments.confirm(btn.dataset.pid); window.toast.success('Payment confirmed!'); window.location.reload();
      }));
      document.querySelectorAll('.reject-pay-btn').forEach(btn => btn.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title:'Reject payment?', okText:'Reject', okClass:'btn-danger' })) return;
        await api.payments.reject(btn.dataset.pid); window.toast.warning('Payment rejected.'); window.location.reload();
      }));
    } catch (err) {
      el.innerHTML = emptyStateEl(err.message);
    }
  },
};
function emptyStateEl(msg) {
  return `<div class="empty-state" style="padding:80px"><span class="empty-icon">⚠️</span><div class="empty-title">${msg}</div><a href="#/admin/bookings" class="btn btn-secondary">← Back</a></div>`;
}
