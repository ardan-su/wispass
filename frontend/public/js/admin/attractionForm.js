import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { CAT_ICONS, catLabel, formatIDR } from '../components/helpers.js';

export default {
  async render(el, params) {
    const editId = params?.id && params.id !== 'new' ? params.id : null;
    setPageTitle(editId ? 'Edit Attraction' : 'New Attraction');

    let attraction = null, ticketTypes = [], images = [];
    if (editId) {
      try {
        const res = await api.attractions.detail(editId);
        attraction = res.attraction; ticketTypes = res.ticketTypes; images = res.images;
      } catch (e) { window.toast.error('Error', e.message); return; }
    }

    const a    = attraction || {};
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const fac  = Array.isArray(a.facilities) ? a.facilities.join(', ') : (a.facilities || '');
    const openDays = a.open_days || days;

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><a href="#/admin/attractions">Attractions</a><span class="breadcrumb-sep">/</span><span>${editId ? 'Edit' : 'New'}</span></div>
          <h2>${editId ? 'Edit Attraction' : 'Create Attraction'}</h2>
        </div>
        <div class="page-header-actions">
          <a href="#/admin/attractions" class="btn btn-ghost btn-sm">← Back</a>
          <button type="submit" form="attr-form" class="btn btn-primary" id="save-btn">${editId ? 'Save Changes' : 'Create Attraction'}</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start">
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="card-header"><span class="card-title">Basic Information</span></div>
            <form id="attr-form">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="a-name">Attraction Name <span class="req">*</span></label>
                  <input class="form-control" id="a-name" name="name" value="${a.name||''}" placeholder="e.g. Aqua Splash Waterpark" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="a-cat">Category <span class="req">*</span></label>
                  <select class="form-control" id="a-cat" name="category" required>
                    <option value="">Select category…</option>
                    ${Object.entries(CAT_ICONS).map(([k,v]) => `<option value="${k}" ${a.category===k?'selected':''}>${v} ${catLabel(k)}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="a-city">City</label>
                  <input class="form-control" id="a-city" name="city" value="${a.city||''}" placeholder="Jakarta" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="a-prov">Province</label>
                  <input class="form-control" id="a-prov" name="province" value="${a.province||''}" placeholder="DKI Jakarta" />
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="a-loc">Full Address</label>
                  <input class="form-control" id="a-loc" name="location" value="${a.location||''}" placeholder="Jl. Example No. 1" />
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="a-maps">Google Maps Link</label>
                  <input class="form-control" id="a-maps" name="mapsLink" value="${a.maps_link||''}" placeholder="https://maps.google.com/…" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="a-open">Opening Time</label>
                  <input type="time" class="form-control" id="a-open" name="openTime" value="${a.open_time||'08:00'}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="a-close">Closing Time</label>
                  <input type="time" class="form-control" id="a-close" name="closeTime" value="${a.close_time||'17:00'}" />
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label">Open Days</label>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
                    ${days.map(d => `
                      <label style="display:flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:.8rem;font-weight:500;transition:all var(--t-base)" class="day-label">
                        <input type="checkbox" name="openDays" value="${d}" ${openDays.includes(d)?'checked':''} style="accent-color:var(--accent)" />
                        ${d.slice(0,3).charAt(0).toUpperCase()+d.slice(1,3)}
                      </label>`).join('')}
                  </div>
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="a-desc">Description</label>
                  <textarea class="form-control" id="a-desc" name="description" rows="4" placeholder="Describe what visitors can expect…">${a.description||''}</textarea>
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="a-fac">Facilities <span class="form-hint">(comma separated)</span></label>
                  <input class="form-control" id="a-fac" name="facilitiesRaw" value="${fac}" placeholder="Parking, Restaurant, WiFi, Prayer Room…" />
                </div>
                <div class="form-group" style="display:flex;flex-direction:row;align-items:center;gap:10px">
                  <input type="checkbox" id="a-feat" name="isFeatured" ${a.is_featured?'checked':''} style="accent-color:var(--accent);width:16px;height:16px" />
                  <label for="a-feat" class="form-label" style="margin:0;cursor:pointer">Featured on homepage</label>
                </div>
                <div class="form-group" style="display:flex;flex-direction:row;align-items:center;gap:10px">
                  <input type="checkbox" id="a-active" name="isActive" ${a.is_active!==false?'checked':''} style="accent-color:var(--accent);width:16px;height:16px" />
                  <label for="a-active" class="form-label" style="margin:0;cursor:pointer">Active (visible to customers)</label>
                </div>
              </div>
            </form>
          </div>

          <div class="card" style="margin-bottom:16px">
            <div class="card-header"><span class="card-title">Cover Image</span></div>
            ${a.cover_image ? `<img src="${a.cover_image}" loading="lazy" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius);margin-bottom:12px" alt="Cover image" />` : ''}
            <input type="file" class="form-control" id="cover-file" accept="image/jpeg,image/jpg,image/png,image/webp" aria-label="Upload cover image" />
            <p class="form-hint" style="margin-top:6px">JPEG, PNG or WebP. Max 5MB. Recommended 1200×600px.</p>
          </div>

          ${editId ? `
          <div class="card">
            <div class="card-header">
              <span class="card-title">Gallery (${images.length} images)</span>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="file" id="gallery-file" accept="image/*" style="display:none" />
                <button class="btn btn-secondary btn-sm" id="add-img-btn">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Add Image
                </button>
              </div>
            </div>
            <div id="images-area" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px">
              ${images.map(img => `
                <div style="position:relative;aspect-ratio:1;border-radius:var(--radius-sm);overflow:hidden;group">
                  <img src="${img.image_url}" loading="lazy" style="width:100%;height:100%;object-fit:cover" alt="" />
                  <button class="btn btn-danger del-img-btn" data-id="${img.id}"
                    style="position:absolute;top:4px;right:4px;padding:3px;width:22px;height:22px;border-radius:50%;opacity:.9"
                    aria-label="Remove image">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>`).join('')}
            </div>
          </div>` : ''}
        </div>

        <div>
          <div class="card" style="margin-bottom:16px;position:sticky;top:76px">
            <div class="card-header">
              <span class="card-title">Ticket Types</span>
              ${editId ? `<button class="btn btn-primary btn-sm" id="add-tt-btn">+ Add</button>` : ''}
            </div>
            <div id="ticket-types-area">
              ${editId ? ticketTypes.map(tt => `
                <div style="padding:11px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                    <div style="flex:1;min-width:0">
                      <div style="font-size:.875rem;font-weight:600;color:var(--text-primary)">${tt.name}</div>
                      <div style="font-size:.75rem;color:var(--text-tertiary);margin-top:2px">${formatIDR(tt.base_price)} base · Quota: ${tt.daily_quota}/day</div>
                    </div>
                    <button class="btn btn-ghost btn-sm del-tt-btn" data-id="${tt.id}" style="color:var(--danger);flex-shrink:0" aria-label="Delete ticket type">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>`).join('') || `<p style="font-size:.8rem;color:var(--text-tertiary);text-align:center;padding:16px">No ticket types yet.</p>`
              : `<p style="font-size:.8rem;color:var(--text-tertiary);padding:12px">Save the attraction first, then add ticket types.</p>`}
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Type Modal -->
      <div class="modal-overlay hidden" id="tt-modal" role="dialog" aria-modal="true" aria-labelledby="tt-modal-title">
        <div class="modal-box modal-md">
          <div class="modal-header">
            <h3 id="tt-modal-title">Add Ticket Type</h3>
            <button class="btn btn-ghost btn-icon" id="tt-modal-close" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <form id="tt-form">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="tt-name">Name <span class="req">*</span></label>
                  <input class="form-control" id="tt-name" name="name" placeholder="Adult, Child, VIP, Family…" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="tt-base">Base Price (Rp) <span class="req">*</span></label>
                  <input type="number" class="form-control" id="tt-base" name="basePrice" placeholder="100000" min="0" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="tt-wknd">Weekend Price (Rp)</label>
                  <input type="number" class="form-control" id="tt-wknd" name="weekendPrice" placeholder="Same as base" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="tt-hol">Holiday Price (Rp)</label>
                  <input type="number" class="form-control" id="tt-hol" name="holidayPrice" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="tt-quota">Daily Quota</label>
                  <input type="number" class="form-control" id="tt-quota" name="dailyQuota" value="100" min="1" />
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label" for="tt-desc">Description</label>
                  <textarea class="form-control" id="tt-desc" name="description" rows="2" placeholder="Optional details about this ticket type"></textarea>
                </div>
              </div>
              <div class="modal-footer" style="padding:0;border:0;margin-top:4px">
                <button type="button" class="btn btn-ghost" id="tt-modal-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Ticket Type</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;

    // ── Form submit ────────────────────────────────────────────────────────
    document.getElementById('attr-form').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const fd   = new FormData();
      const checked = [...form.querySelectorAll('[name=openDays]:checked')].map(cb => cb.value);

      fd.append('name',        form.name.value);
      fd.append('category',    form.category.value);
      fd.append('city',        form.city.value);
      fd.append('province',    form.province.value);
      fd.append('location',    form.location.value);
      fd.append('mapsLink',    form.mapsLink.value);
      fd.append('openTime',    form.openTime.value);
      fd.append('closeTime',   form.closeTime.value);
      fd.append('description', form.description.value);
      fd.append('openDays',    JSON.stringify(checked));
      fd.append('facilities',  JSON.stringify(form.facilitiesRaw.value.split(',').map(s => s.trim()).filter(Boolean)));
      fd.append('isFeatured',  form.isFeatured.checked ? 'true' : 'false');
      fd.append('isActive',    form.isActive.checked   ? 'true' : 'false');
      const coverFile = document.getElementById('cover-file')?.files[0];
      if (coverFile) fd.append('cover', coverFile);

      const btn = document.getElementById('save-btn');
      btn.classList.add('btn-loading'); btn.disabled = true;
      try {
        if (editId) {
          await api.attractions.update(editId, fd);
          window.toast.success('Saved!', 'Attraction updated.');
        } else {
          const res = await api.attractions.create(fd);
          window.toast.success('Created!', 'Attraction is live.');
          window.location.hash = `#/admin/attractions/${res.attraction.id}`;
          return;
        }
      } catch (err) { window.toast.error('Error', err.message); }
      btn.classList.remove('btn-loading'); btn.disabled = false;
    });

    if (!editId) return;

    // ── Gallery ────────────────────────────────────────────────────────────
    document.getElementById('add-img-btn')?.addEventListener('click', () => document.getElementById('gallery-file').click());
    document.getElementById('gallery-file')?.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      const fd = new FormData(); fd.append('image', file);
      try { await api.attractions.addImage(editId, fd); window.toast.success('Uploaded'); window.location.reload(); }
      catch (err) { window.toast.error('Error', err.message); }
    });
    document.querySelectorAll('.del-img-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await api.attractions.removeImage(btn.dataset.id);
        btn.closest('div').remove(); window.toast.info('Removed');
      });
    });

    // ── Ticket Types ───────────────────────────────────────────────────────
    const ttModal = document.getElementById('tt-modal');
    document.getElementById('add-tt-btn')?.addEventListener('click', () => ttModal.classList.remove('hidden'));
    document.getElementById('tt-modal-close')?.addEventListener('click', () => ttModal.classList.add('hidden'));
    document.getElementById('tt-modal-cancel')?.addEventListener('click', () => ttModal.classList.add('hidden'));
    ttModal?.addEventListener('click', e => { if (e.target === ttModal) ttModal.classList.add('hidden'); });

    document.getElementById('tt-form')?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      try {
        await api.ticketTypes.create(editId, {
          name: f.name.value, description: f.description.value,
          basePrice: f.basePrice.value, weekendPrice: f.weekendPrice.value || null,
          holidayPrice: f.holidayPrice.value || null, dailyQuota: f.dailyQuota.value,
        });
        window.toast.success('Added', 'Ticket type created.');
        ttModal.classList.add('hidden');
        window.location.reload();
      } catch (err) { window.toast.error('Error', err.message); }
    });

    document.querySelectorAll('.del-tt-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title: 'Delete ticket type?', okText: 'Delete', okClass: 'btn-danger', icon: '🗑️' })) return;
        await api.ticketTypes.delete(btn.dataset.id);
        btn.closest('div').remove(); window.toast.success('Deleted');
      });
    });
  },
};
