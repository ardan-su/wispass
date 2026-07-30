import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR } from '../components/helpers.js';

export default {
  async render(el, params) {
    setPageTitle('Book Tickets');
    el.innerHTML = `<div class="page-spinner" style="min-height:300px"><div class="spinner"></div></div>`;
    try {
      const { attraction, ticketTypes } = await api.attractions.detail(params.id);
      setPageTitle(`Book – ${attraction.name}`);
      this._attraction  = attraction;
      this._ticketTypes = ticketTypes;
      this._items       = {};
      this._promo       = null;
      this._date        = null;

      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const minDate  = tomorrow.toISOString().split('T')[0];

      el.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <div class="breadcrumb">
              <a href="#/attraction/${attraction.id}">${attraction.name}</a>
              <span class="breadcrumb-sep">/</span><span>Book Tickets</span>
            </div>
            <h2>Book Tickets</h2>
          </div>
          <div class="page-header-actions">
            <a href="#/attraction/${attraction.id}" class="btn btn-ghost btn-sm">← Back</a>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start">
          <!-- Steps -->
          <div>
            <!-- Step 1: Date -->
            <div class="card" style="margin-bottom:14px">
              <div class="card-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0">1</div>
                  <span class="card-title">Select Visit Date</span>
                </div>
              </div>
              <div class="form-group" style="max-width:280px;margin-bottom:10px">
                <input type="date" class="form-control" id="visit-date" min="${minDate}"
                  aria-label="Select visit date" aria-required="true" />
              </div>
              <div id="availability-area"></div>
            </div>

            <!-- Step 2: Tickets -->
            <div class="card" style="margin-bottom:14px">
              <div class="card-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0">2</div>
                  <span class="card-title">Select Tickets</span>
                </div>
              </div>
              ${ticketTypes.map(tt => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:13px;border:1.5px solid var(--border);border-radius:var(--radius);margin-bottom:8px;transition:all var(--t-base)" id="tt-${tt.id}">
                  <div>
                    <div style="font-weight:600;font-size:.9375rem">${tt.name}</div>
                    <div id="price-${tt.id}" style="font-size:1rem;font-weight:700;color:var(--accent);margin:2px 0">${formatIDR(tt.base_price)}</div>
                    ${tt.description ? `<div style="font-size:.75rem;color:var(--text-tertiary)">${tt.description}</div>` : ''}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px" role="group" aria-label="Quantity for ${tt.name}">
                    <button class="btn btn-secondary btn-sm qty-btn" data-id="${tt.id}" data-action="dec" style="width:32px;height:32px;padding:0;border-radius:50%" aria-label="Decrease quantity">−</button>
                    <span id="qty-${tt.id}" style="min-width:28px;text-align:center;font-size:1rem;font-weight:700" aria-live="polite">0</span>
                    <button class="btn btn-secondary btn-sm qty-btn" data-id="${tt.id}" data-action="inc" style="width:32px;height:32px;padding:0;border-radius:50%" aria-label="Increase quantity">+</button>
                  </div>
                </div>`).join('')}
            </div>

            <!-- Step 3: Visitor info -->
            <div class="card" style="margin-bottom:14px">
              <div class="card-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0">3</div>
                  <span class="card-title">Visitor Information</span>
                </div>
              </div>
              <div id="visitor-data-area">
                <p style="font-size:.875rem;color:var(--text-tertiary)">Add tickets in step 2 to fill visitor info.</p>
              </div>
            </div>

            <!-- Step 4: Notes -->
            <div class="card">
              <div class="card-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0">4</div>
                  <span class="card-title">Notes <span style="font-weight:400;color:var(--text-tertiary)">(optional)</span></span>
                </div>
              </div>
              <textarea class="form-control" id="booking-notes" rows="3" placeholder="Special requests, accessibility needs, etc." aria-label="Booking notes"></textarea>
            </div>
          </div>

          <!-- Order Summary -->
          <div style="position:sticky;top:76px">
            <div class="card">
              <div class="card-header"><span class="card-title">Order Summary</span></div>
              <div id="order-summary">
                <div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:.875rem">Select date and tickets to see summary.</div>
              </div>

              <!-- Promo code -->
              <div style="border-top:1px solid var(--border-subtle);padding-top:14px;margin-top:14px">
                <div class="form-group" style="margin-bottom:8px">
                  <label class="form-label" for="promo-code">Promo Code</label>
                  <div style="display:flex;gap:8px">
                    <input class="form-control" id="promo-code" placeholder="e.g. WELCOME10"
                      style="font-family:var(--font-mono);text-transform:uppercase;font-weight:600;letter-spacing:.04em" aria-label="Enter promo code" />
                    <button class="btn btn-secondary btn-sm" id="apply-promo-btn" style="flex-shrink:0;white-space:nowrap">Apply</button>
                  </div>
                  <div id="promo-msg" class="form-hint" style="margin-top:5px"></div>
                </div>
              </div>

              <div id="total-area"></div>

              <button class="btn btn-primary btn-xl w-full" id="book-btn" style="justify-content:center;margin-top:14px" disabled aria-disabled="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                <span class="btn-text">Confirm Booking</span>
              </button>
              <p style="font-size:.72rem;color:var(--text-tertiary);text-align:center;margin-top:8px">Tickets generated instantly after booking</p>
            </div>
          </div>
        </div>`;

      this.bindEvents(el, attraction.id);
    } catch (err) {
      el.innerHTML = `<div class="empty-state" style="padding:80px 20px"><span class="empty-icon">⚠️</span><div class="empty-title">${err.message}</div><a href="#/browse" class="btn btn-secondary">← Back</a></div>`;
    }
  },

  bindEvents(el, attractionId) {
    document.getElementById('visit-date').addEventListener('change', async e => {
      this._date = e.target.value;
      if (!this._date) return;
      try {
        const avail = await api.ticketTypes.availability(attractionId, this._date);
        const area  = document.getElementById('availability-area');
        const isWknd = [0,6].includes(new Date(this._date).getDay());
        area.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px">` +
          avail.ticketTypes.map(tt => `
            <span style="font-size:.75rem;padding:4px 9px;border-radius:var(--radius-full);border:1px solid ${tt.available?'var(--success-border)':'var(--danger-border)'};background:${tt.available?'var(--success-bg)':'var(--danger-bg)'};color:${tt.available?'var(--success)':'var(--danger)'};font-weight:500">
              ${tt.available?'✓':'✕'} ${tt.name}: ${tt.remaining} left
            </span>`).join('') + `</div>`;

        this._ticketTypes.forEach(tt => {
          const price = isWknd && tt.weekend_price ? parseFloat(tt.weekend_price) : parseFloat(tt.base_price);
          tt._price = price;
          const priceEl = document.getElementById(`price-${tt.id}`);
          if (priceEl) priceEl.textContent = formatIDR(price);
        });
      } catch (_) {}
      this.updateSummary();
    });

    el.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.id;
        const tt  = this._ticketTypes.find(t => t.id === id);
        const cur = this._items[id] || 0;
        this._items[id] = btn.dataset.action === 'inc'
          ? Math.min(cur + 1, tt.max_purchase || 10)
          : Math.max(cur - 1, 0);
        document.getElementById(`qty-${id}`).textContent = this._items[id];
        const card = document.getElementById(`tt-${id}`);
        if (card) card.style.borderColor = this._items[id] > 0 ? 'var(--accent)' : 'var(--border)';
        this.updateVisitorFields();
        this.updateSummary();
      });
    });

    document.getElementById('apply-promo-btn').addEventListener('click', async () => {
      const code  = document.getElementById('promo-code').value.trim().toUpperCase();
      const msgEl = document.getElementById('promo-msg');
      if (!code) return;
      const subtotal = this.calcSubtotal();
      try {
        const res    = await api.promotions.validateCode({ code, amount: subtotal });
        this._promo  = { ...res.promotion, discount: res.discountAmount };
        msgEl.style.color = 'var(--success)';
        msgEl.textContent = `✓ ${res.promotion.name} — saves ${formatIDR(res.discountAmount)}`;
        this.updateSummary();
      } catch (err) {
        this._promo = null;
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = `✕ ${err.message}`;
        this.updateSummary();
      }
    });

    document.getElementById('promo-code').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('apply-promo-btn').click();
    });

    document.getElementById('book-btn').addEventListener('click', () => this.submitBooking(attractionId));
  },

  updateVisitorFields() {
    const area  = document.getElementById('visitor-data-area');
    const items = Object.entries(this._items).filter(([,q]) => q > 0);
    if (!items.length) { area.innerHTML = `<p style="font-size:.875rem;color:var(--text-tertiary)">Add tickets in step 2.</p>`; return; }
    area.innerHTML = items.map(([id, qty]) => {
      const tt = this._ticketTypes.find(t => t.id === id);
      return [...Array(qty)].map((_, i) => `
        <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px">
          <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px">${tt.name} · Visitor ${i+1}</div>
          <input class="form-control" placeholder="Full Name" data-tt="${id}" data-idx="${i}" data-field="name"
            aria-label="${tt.name} visitor ${i+1} name" />
        </div>`).join('');
    }).join('');
  },

  calcSubtotal() {
    return Object.entries(this._items).reduce((sum, [id, qty]) => {
      const tt = this._ticketTypes.find(t => t.id === id);
      return sum + (parseFloat(tt._price || tt.base_price) * qty);
    }, 0);
  },

  updateSummary() {
    const items    = Object.entries(this._items).filter(([,q]) => q > 0);
    const btn      = document.getElementById('book-btn');
    const summaryEl= document.getElementById('order-summary');
    const totalEl  = document.getElementById('total-area');

    if (!items.length || !this._date) {
      summaryEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:.875rem">Select date and tickets to see summary.</div>`;
      totalEl.innerHTML = '';
      btn.disabled = true; btn.setAttribute('aria-disabled','true');
      return;
    }

    const subtotal = this.calcSubtotal();
    const discount = this._promo ? this._promo.discount : 0;
    const total    = subtotal - discount;

    summaryEl.innerHTML = `
      <div style="font-size:.8rem;color:var(--text-tertiary);margin-bottom:10px;padding:6px 10px;background:var(--bg-secondary);border-radius:var(--radius-sm)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;color:var(--accent)" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        Visit: <strong>${new Date(this._date).toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</strong>
      </div>
      ${items.map(([id, qty]) => {
        const tt = this._ticketTypes.find(t => t.id === id);
        const p  = parseFloat(tt._price || tt.base_price);
        return `<div class="info-row" style="font-size:.8125rem"><span>${tt.name} × ${qty}</span><span style="font-weight:600">${formatIDR(p * qty)}</span></div>`;
      }).join('')}`;

    totalEl.innerHTML = `
      <div style="border-top:1px solid var(--border-subtle);padding-top:12px;margin-top:4px">
        <div class="info-row" style="font-size:.8125rem"><span style="color:var(--text-tertiary)">Subtotal</span><span>${formatIDR(subtotal)}</span></div>
        ${discount > 0 ? `<div class="info-row" style="font-size:.8125rem;color:var(--success)"><span>Discount</span><span style="font-weight:600">− ${formatIDR(discount)}</span></div>` : ''}
        <div class="info-row" style="font-size:1.0625rem;font-weight:800;margin-top:4px"><span>Total</span><span style="color:var(--accent)">${formatIDR(total)}</span></div>
      </div>`;

    btn.disabled = false; btn.setAttribute('aria-disabled','false');
  },

  async submitBooking(attractionId) {
    const items = Object.entries(this._items).filter(([,q]) => q > 0).map(([id, quantity]) => ({
      ticketTypeId: id, quantity,
      visitorData: [...document.querySelectorAll(`[data-tt="${id}"]`)]
        .filter(i => i.dataset.field === 'name')
        .map(i => ({ name: i.value.trim() })),
    }));

    if (!this._date)     return window.toast.warning('Date required', 'Please select a visit date.');
    if (!items.length)   return window.toast.warning('Tickets required', 'Please select at least one ticket.');

    const btn = document.getElementById('book-btn');
    btn.classList.add('btn-loading'); btn.disabled = true;

    try {
      const res = await api.bookings.create({
        attractionId, visitDate: this._date, items,
        promoCode: this._promo?.code || undefined,
        notes: document.getElementById('booking-notes').value,
      });
      window.toast.success('Booking created!', `Code: ${res.booking.booking_code}`);
      window.location.hash = `#/booking/${res.booking.id}`;
    } catch (err) {
      window.toast.error('Booking failed', err.message);
      btn.classList.remove('btn-loading'); btn.disabled = false;
    }
  },
};
