import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatDate, formatIDR, statusBadge, paginationHTML, bindPagination, emptyState, qs, skeletonRows } from '../components/helpers.js';

let state = { page: 1, search: '' };

export default {
  async render(el) {
    setPageTitle('Promotions');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Promotions</span></div>
          <h2>Promotions & Vouchers</h2>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="new-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            New Voucher
          </button>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden"><div id="table-area"></div></div>
      <div id="pagination"></div>

      <!-- Modal -->
      <div class="modal-overlay hidden" id="promo-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-box modal-md">
          <div class="modal-header">
            <h3 id="modal-title">New Voucher</h3>
            <button class="btn btn-ghost btn-icon" id="modal-close" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <form id="promo-form">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="p-code">Voucher Code <span class="req">*</span></label>
                  <input class="form-control" id="p-code" name="code" placeholder="WELCOME10" style="font-family:var(--font-mono);text-transform:uppercase;font-weight:600;letter-spacing:.05em" required />
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="p-name">Name <span class="req">*</span></label>
                  <input class="form-control" id="p-name" name="name" placeholder="Welcome Discount 10%" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-type">Discount Type <span class="req">*</span></label>
                  <select class="form-control" id="p-type" name="discountType">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rp)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-val">Discount Value <span class="req">*</span></label>
                  <input type="number" class="form-control" id="p-val" name="discountValue" placeholder="10" min="0" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-min">Min. Purchase (Rp)</label>
                  <input type="number" class="form-control" id="p-min" name="minPurchase" value="0" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-max">Max Discount (Rp)</label>
                  <input type="number" class="form-control" id="p-max" name="maxDiscount" placeholder="Leave blank = unlimited" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-limit">Usage Limit</label>
                  <input type="number" class="form-control" id="p-limit" name="usageLimit" placeholder="Unlimited" min="1" />
                </div>
                <div class="form-group">
                  <!-- spacer --> <div></div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-from">Valid From <span class="req">*</span></label>
                  <input type="datetime-local" class="form-control" id="p-from" name="validFrom" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="p-until">Valid Until <span class="req">*</span></label>
                  <input type="datetime-local" class="form-control" id="p-until" name="validUntil" required />
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="p-desc">Description</label>
                  <textarea class="form-control" id="p-desc" name="description" rows="2" placeholder="Optional description…"></textarea>
                </div>
              </div>
              <div id="modal-err" class="form-error hidden" style="padding:8px 12px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius-sm);margin-bottom:12px"></div>
              <div class="modal-footer" style="padding:0;border:none;margin-top:4px">
                <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary" id="modal-submit">
                  <span class="btn-text">Create Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>`;

    document.getElementById('new-btn').addEventListener('click',    () => this.openModal());
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click',() => this.closeModal());
    document.getElementById('promo-modal').addEventListener('click', e => { if (e.target === document.getElementById('promo-modal')) this.closeModal(); });
    document.getElementById('promo-form').addEventListener('submit', e => this.submitForm(e));
    await this.load();
  },

  async load() {
    const area = document.getElementById('table-area');
    area.innerHTML = `<div class="table-wrapper" style="border:none;border-radius:0"><table><thead><tr>
      <th>Code</th><th>Name</th><th>Discount</th><th>Usage</th><th>Valid Until</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>${skeletonRows(7, 5)}</tbody></table></div>`;
    try {
      const res = await api.promotions.list(qs({ page: state.page, limit: 10, search: state.search }));
      this.renderTable(area, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) { area.innerHTML = emptyState('⚠️', err.message, ''); }
  },

  renderTable(area, rows) {
    if (!rows.length) {
      area.innerHTML = emptyState('🎟️', 'No promotions yet', 'Create your first voucher code.', `<button class="btn btn-primary" onclick="document.getElementById('new-btn').click()">Create Voucher</button>`);
      return;
    }
    const isActive = p => p.is_active && new Date(p.valid_until) > new Date();
    area.innerHTML = `
      <div class="table-wrapper" style="border:none;border-radius:0">
        <table aria-label="Promotions list"><thead><tr>
          <th>Code</th><th>Name</th><th>Discount</th><th>Usage</th><th>Valid Until</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows.map(p => `<tr>
          <td>
            <span style="font-family:var(--font-mono);font-size:.8rem;font-weight:700;background:var(--accent-subtle);color:var(--accent);padding:3px 8px;border-radius:4px;border:1px solid var(--accent-border)">${p.code}</span>
          </td>
          <td style="font-size:.875rem;font-weight:500">${p.name}</td>
          <td style="font-size:.875rem;font-weight:600">${p.discount_type === 'percentage' ? `${p.discount_value}%` : formatIDR(p.discount_value)}</td>
          <td style="font-size:.8125rem">
            <span style="font-weight:600">${p.used_count}</span>
            <span style="color:var(--text-tertiary)"> / ${p.usage_limit || '∞'}</span>
          </td>
          <td style="font-size:.8rem;color:var(--text-tertiary);white-space:nowrap">${formatDate(p.valid_until, {day:'2-digit',month:'short',year:'numeric'})}</td>
          <td>${isActive(p) ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-gray badge-dot">Inactive</span>'}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost btn-sm edit-btn" data-id="${p.id}" style="color:var(--accent)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                Edit
              </button>
              <button class="btn btn-ghost btn-sm del-btn" data-id="${p.id}" data-code="${p.code}" style="color:var(--danger)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}</tbody></table>
      </div>`;

    area.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', async () => {
      if (!await window.modal.confirm({ title: `Delete ${btn.dataset.code}?`, okText: 'Delete', okClass: 'btn-danger', icon: '🗑️' })) return;
      await api.promotions.delete(btn.dataset.id); window.toast.success('Deleted'); this.load();
    }));
    area.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', async () => {
      const { promotion } = await api.promotions.detail(btn.dataset.id);
      this.openModal(promotion);
    }));
  },

  openModal(promo = null) {
    const form = document.getElementById('promo-form');
    form.reset();
    document.getElementById('modal-err').classList.add('hidden');
    document.getElementById('modal-title').textContent  = promo ? 'Edit Voucher' : 'New Voucher';
    document.getElementById('modal-submit').querySelector('.btn-text').textContent = promo ? 'Save Changes' : 'Create Voucher';
    if (promo) {
      form.code.value         = promo.code;
      form.name.value         = promo.name;
      form.discountType.value = promo.discount_type;
      form.discountValue.value= promo.discount_value;
      form.minPurchase.value  = promo.min_purchase;
      form.maxDiscount.value  = promo.max_discount || '';
      form.usageLimit.value   = promo.usage_limit  || '';
      form.validFrom.value    = new Date(promo.valid_from).toISOString().slice(0, 16);
      form.validUntil.value   = new Date(promo.valid_until).toISOString().slice(0, 16);
      form.description.value  = promo.description  || '';
      form.dataset.editId     = promo.id;
    } else { delete form.dataset.editId; }
    document.getElementById('promo-modal').classList.remove('hidden');
    document.getElementById('p-code').focus();
  },

  closeModal() { document.getElementById('promo-modal').classList.add('hidden'); },

  async submitForm(e) {
    e.preventDefault();
    const f = e.target, editId = f.dataset.editId;
    const errEl = document.getElementById('modal-err');
    errEl.classList.add('hidden');
    const data = {
      code: f.code.value.toUpperCase(), name: f.name.value,
      discountType: f.discountType.value, discountValue: parseFloat(f.discountValue.value),
      minPurchase:  parseFloat(f.minPurchase.value) || 0,
      maxDiscount:  f.maxDiscount.value  ? parseFloat(f.maxDiscount.value)  : null,
      usageLimit:   f.usageLimit.value   ? parseInt(f.usageLimit.value)     : null,
      validFrom:  new Date(f.validFrom.value).toISOString(),
      validUntil: new Date(f.validUntil.value).toISOString(),
      description: f.description.value,
    };
    const btn = document.getElementById('modal-submit');
    btn.classList.add('btn-loading'); btn.disabled = true;
    try {
      if (editId) { await api.promotions.update(editId, data); window.toast.success('Updated!'); }
      else        { await api.promotions.create(data);         window.toast.success('Created!', 'Voucher is now active.'); }
      this.closeModal(); this.load();
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
    }
    btn.classList.remove('btn-loading'); btn.disabled = false;
  },
};
