import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, CAT_ICONS, catLabel } from '../components/helpers.js';

export default {
  async render(el, params) {
    setPageTitle('Loading…');
    el.innerHTML = `<div class="page-spinner" style="min-height:400px"><div class="spinner"></div></div>`;
    try {
      const { attraction: a, ticketTypes, images, reviews } = await api.attractions.detail(params.id);
      setPageTitle(a.name);

      const allImages = [a.cover_image, ...images.map(i => i.image_url)].filter(Boolean);
      const facilities = Array.isArray(a.facilities) ? a.facilities : (a.facilities ? JSON.parse(a.facilities) : []);

      el.innerHTML = `
        <div class="breadcrumb" style="margin-bottom:14px">
          <a href="#/browse">Browse</a>
          <span class="breadcrumb-sep">/</span>
          <span class="badge badge-info" style="font-size:.7rem">${catLabel(a.category)}</span>
          <span class="breadcrumb-sep">/</span>
          <span class="truncate" style="max-width:200px">${a.name}</span>
        </div>

        <!-- Gallery -->
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;border-radius:var(--radius-xl);overflow:hidden;margin-bottom:24px;max-height:380px" aria-label="Gallery">
          <div style="background:var(--bg-secondary);overflow:hidden">
            ${allImages[0]
              ? `<img src="${allImages[0]}" loading="lazy" style="width:100%;height:380px;object-fit:cover;transition:transform var(--t-slow)" alt="${a.name}" />`
              : `<div style="height:380px;display:flex;align-items:center;justify-content:center;font-size:5rem;background:var(--accent-subtle)" aria-hidden="true">${CAT_ICONS[a.category]||'🏝️'}</div>`}
          </div>
          <div style="display:grid;grid-template-rows:1fr 1fr;gap:8px">
            ${allImages.slice(1,3).map((img,i) =>
              `<div style="overflow:hidden;background:var(--bg-secondary)">
                <img src="${img}" loading="lazy" style="width:100%;height:100%;object-fit:cover" alt="Gallery image ${i+2}" />
              </div>`
            ).join('')}
            ${allImages.length < 3 ? [...Array(3-allImages.length)].map(() => `<div style="background:var(--bg-secondary);border-radius:2px"></div>`).join('') : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start">
          <!-- Left: info -->
          <div>
            <div class="card" style="margin-bottom:16px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
                <div style="flex:1;min-width:0">
                  <div style="margin-bottom:8px">
                    <span class="badge badge-info">${CAT_ICONS[a.category]||''} ${catLabel(a.category)}</span>
                    ${a.is_featured ? '<span class="badge badge-primary" style="margin-left:6px">Featured</span>' : ''}
                  </div>
                  <h2 style="font-size:1.625rem;font-weight:800;letter-spacing:-.03em;margin-bottom:8px">${a.name}</h2>
                  <div style="display:flex;align-items:center;gap:6px;color:var(--text-tertiary);font-size:.875rem;margin-bottom:8px">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${a.location || `${a.city}, ${a.province}`}
                  </div>
                  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                    <span style="display:flex;align-items:center;gap:5px;font-size:.875rem;font-weight:600;color:var(--warning)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ${parseFloat(a.average_rating||0).toFixed(1)} <span style="font-weight:400;color:var(--text-tertiary)">(${a.total_reviews} reviews)</span>
                    </span>
                    <span style="font-size:.875rem;color:var(--text-tertiary)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      ${a.total_visitors.toLocaleString('id-ID')} visitors
                    </span>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:.72rem;color:var(--text-tertiary);margin-bottom:2px">Starting from</div>
                  <div style="font-size:1.75rem;font-weight:800;color:var(--text-primary);letter-spacing:-.03em">${a.min_price ? formatIDR(a.min_price) : 'Free'}</div>
                  <div style="font-size:.72rem;color:var(--text-tertiary)">/person</div>
                </div>
              </div>
            </div>

            ${a.description ? `
            <div class="card" style="margin-bottom:16px">
              <div class="card-header"><span class="card-title">About</span></div>
              <p style="line-height:1.75;color:var(--text-secondary)">${a.description}</p>
            </div>` : ''}

            ${facilities.length ? `
            <div class="card" style="margin-bottom:16px">
              <div class="card-header"><span class="card-title">Facilities</span></div>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${facilities.map(f => `
                  <span style="display:inline-flex;align-items:center;gap:5px;background:var(--bg-secondary);border:1px solid var(--border);padding:5px 11px;border-radius:var(--radius-full);font-size:.78rem;font-weight:500">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    ${f}
                  </span>`).join('')}
              </div>
            </div>` : ''}

            <!-- Reviews -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">Reviews <span class="badge badge-gray" style="margin-left:6px">${a.total_reviews}</span></span>
              </div>
              ${reviews.length ? reviews.map(r => `
                <div style="padding:12px 0;border-bottom:1px solid var(--border-subtle)">
                  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:7px">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:.8125rem;font-weight:700;color:var(--accent);flex-shrink:0">${(r.customer_name||'?')[0].toUpperCase()}</div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:.875rem">${r.customer_name}</div>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="color:var(--warning);font-size:.8rem">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                        <span style="font-size:.72rem;color:var(--text-tertiary)">${formatDate(r.created_at, {day:'2-digit',month:'short',year:'numeric'})}</span>
                      </div>
                    </div>
                  </div>
                  ${r.title ? `<div style="font-size:.875rem;font-weight:600;margin-bottom:4px">${r.title}</div>` : ''}
                  ${r.comment ? `<p style="font-size:.875rem;color:var(--text-secondary);line-height:1.6;margin:0">${r.comment}</p>` : ''}
                </div>`).join('')
              : `<div class="empty-state" style="padding:28px"><span class="empty-icon" style="font-size:2.25rem">💬</span><div class="empty-title">No reviews yet</div><p class="empty-message">Be the first to share your experience!</p></div>`}
            </div>
          </div>

          <!-- Right: booking card -->
          <div style="position:sticky;top:76px">
            <div class="card" style="margin-bottom:12px">
              <div class="card-header"><span class="card-title">Opening Hours</span></div>
              <div class="info-row"><span class="info-label">Hours</span><span class="info-value font-semibold">${a.open_time||'—'} – ${a.close_time||'—'}</span></div>
              <div class="info-row"><span class="info-label">Location</span><span class="info-value">${a.city}, ${a.province}</span></div>
              ${a.maps_link ? `
                <a href="${a.maps_link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary w-full" style="justify-content:center;margin-top:12px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
                  View on Map
                </a>` : ''}
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title">Ticket Types</span></div>
              ${ticketTypes.map(tt => `
                <div style="padding:11px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;transition:border-color var(--t-base)">
                  <div style="font-weight:600;font-size:.875rem;margin-bottom:3px">${tt.name}</div>
                  <div style="font-size:1rem;font-weight:700;color:var(--accent)">${formatIDR(tt.base_price)}</div>
                  ${tt.weekend_price && tt.weekend_price !== tt.base_price ? `<div style="font-size:.72rem;color:var(--text-tertiary)">Weekend: ${formatIDR(tt.weekend_price)}</div>` : ''}
                </div>`).join('')}
              <a href="#/book/${a.id}" class="btn btn-primary btn-xl w-full" style="justify-content:center;margin-top:4px">
                Book Now
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>
          </div>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div class="empty-state" style="padding:80px 20px">
        <span class="empty-icon">⚠️</span>
        <div class="empty-title">${err.message}</div>
        <a href="#/browse" class="btn btn-secondary">← Back to Browse</a>
      </div>`;
    }
  },
};
