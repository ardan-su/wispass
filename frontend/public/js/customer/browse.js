import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, paginationHTML, bindPagination, debounce, emptyState, qs, CAT_ICONS, catLabel } from '../components/helpers.js';

let state = { page: 1, search: '', category: '', city: '', sortBy: 'newest' };

export default {
  async render(el) {
    setPageTitle('Browse Attractions');
    el.innerHTML = `<div class="page-spinner"><div class="spinner"></div></div>`;

    const [catRes, cityRes] = await Promise.all([
      api.attractions.categories().catch(() => ({ categories: [] })),
      api.attractions.cities().catch(() => ({ cities: [] })),
    ]);

    el.innerHTML = `
      <div class="page-header" style="margin-bottom:20px">
        <div class="page-header-left">
          <h2>Browse Attractions</h2>
          <p style="font-size:.875rem;color:var(--text-secondary);margin:2px 0 0">Discover amazing tourist destinations across Indonesia</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start">
        <!-- Sidebar filters -->
        <div style="position:sticky;top:76px">
          <div class="card card-sm" style="margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
              <span style="font-size:.875rem;font-weight:600">Filters</span>
              <button class="btn btn-ghost btn-sm" id="clear-filters" style="font-size:.75rem;color:var(--accent)">Clear all</button>
            </div>
            <div class="form-group">
              <label class="form-label" for="cat-filter">Category</label>
              <select class="form-control" id="cat-filter" aria-label="Filter by category">
                <option value="">All Categories</option>
                ${(catRes.categories||[]).map(c => `<option value="${c.category}" ${state.category===c.category?'selected':''}>${CAT_ICONS[c.category]||''} ${catLabel(c.category)} (${c.count})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="city-filter">City</label>
              <select class="form-control" id="city-filter" aria-label="Filter by city">
                <option value="">All Cities</option>
                ${(cityRes.cities||[]).map(c => `<option value="${c.city}" ${state.city===c.city?'selected':''}>${c.city} (${c.count})</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" for="sort-filter">Sort by</label>
              <select class="form-control" id="sort-filter" aria-label="Sort order">
                <option value="newest"       ${state.sortBy==='newest'       ?'selected':''}>Newest</option>
                <option value="popular"      ${state.sortBy==='popular'      ?'selected':''}>Most Popular</option>
                <option value="lowest_price" ${state.sortBy==='lowest_price' ?'selected':''}>Lowest Price</option>
                <option value="highest_price"${state.sortBy==='highest_price'?'selected':''}>Highest Price</option>
                <option value="rating"       ${state.sortBy==='rating'       ?'selected':''}>Best Rating</option>
              </select>
            </div>
          </div>

          <!-- Category quick links -->
          <div class="card card-sm">
            <div style="font-size:.8rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Quick Filter</div>
            ${Object.entries(CAT_ICONS).map(([k,v]) => `
              <button class="btn btn-ghost btn-sm cat-quick" data-cat="${k}"
                style="width:100%;justify-content:flex-start;gap:8px;font-size:.8125rem;padding:6px 8px;${state.category===k?'background:var(--accent-subtle);color:var(--accent);font-weight:600':''}">
                <span aria-hidden="true">${v}</span> ${catLabel(k)}
              </button>`).join('')}
          </div>
        </div>

        <!-- Main content -->
        <div>
          <div style="display:flex;gap:10px;margin-bottom:16px">
            <div class="search-wrapper" style="flex:1">
              <span class="search-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
              <input class="form-control" id="search" placeholder="Search attractions, cities, descriptions…" value="${state.search}" aria-label="Search attractions" />
            </div>
          </div>
          <div id="count-bar" style="font-size:.8125rem;color:var(--text-tertiary);margin-bottom:14px;min-height:18px"></div>
          <div id="grid-area"></div>
          <div id="pagination"></div>
        </div>
      </div>`;

    document.getElementById('search').addEventListener('input',
      debounce(e => { state.search = e.target.value; state.page = 1; this.load(); }, 380));
    document.getElementById('cat-filter').addEventListener('change',  e => { state.category = e.target.value; state.page = 1; this.load(); });
    document.getElementById('city-filter').addEventListener('change', e => { state.city = e.target.value; state.page = 1; this.load(); });
    document.getElementById('sort-filter').addEventListener('change', e => { state.sortBy = e.target.value; state.page = 1; this.load(); });
    document.getElementById('clear-filters').addEventListener('click', () => {
      Object.assign(state, { page:1, search:'', category:'', city:'', sortBy:'newest' });
      document.getElementById('search').value = '';
      document.getElementById('cat-filter').value = '';
      document.getElementById('city-filter').value = '';
      document.getElementById('sort-filter').value = 'newest';
      el.querySelectorAll('.cat-quick').forEach(b => { b.style.background = ''; b.style.color = ''; b.style.fontWeight = ''; });
      this.load();
    });
    el.querySelectorAll('.cat-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        const same = state.category === btn.dataset.cat;
        state.category = same ? '' : btn.dataset.cat; state.page = 1;
        document.getElementById('cat-filter').value = state.category;
        el.querySelectorAll('.cat-quick').forEach(b => { b.style.background=''; b.style.color=''; b.style.fontWeight=''; });
        if (!same) { btn.style.background='var(--accent-subtle)'; btn.style.color='var(--accent)'; btn.style.fontWeight='600'; }
        this.load();
      });
    });
    await this.load();
  },

  async load() {
    const grid = document.getElementById('grid-area');
    grid.innerHTML = `<div class="attractions-grid">${[...Array(8)].map(() => `
      <div class="attraction-card" style="pointer-events:none">
        <div class="skeleton" style="height:176px;border-radius:0"></div>
        <div style="padding:14px 16px">
          <div class="skeleton skeleton-text" style="width:40%;height:10px;margin-bottom:8px"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width:65%"></div>
        </div>
      </div>`).join('')}</div>`;

    try {
      const q   = qs({ page: state.page, limit: 12, search: state.search, category: state.category, city: state.city, sortBy: state.sortBy });
      const res = await api.attractions.list(q);
      const count = res.pagination?.total || 0;
      document.getElementById('count-bar').textContent = `${count} attraction${count !== 1 ? 's' : ''} found`;
      this.renderGrid(grid, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); window.scrollTo({top:0,behavior:'smooth'}); });
      bindPagination(pag, p => { state.page = p; this.load(); window.scrollTo({top:0,behavior:'smooth'}); });
    } catch (err) {
      grid.innerHTML = emptyState('⚠️', 'Failed to load', err.message, `<button class="btn btn-secondary" onclick="location.reload()">Retry</button>`);
    }
  },

  renderGrid(grid, rows) {
    if (!rows.length) {
      grid.innerHTML = emptyState('🔍', 'No attractions found', 'Try different filters or clear your search.',
        `<button class="btn btn-secondary" id="clear-btn">Clear Filters</button>`);
      document.getElementById('clear-btn')?.addEventListener('click', () => document.getElementById('clear-filters').click());
      return;
    }
    grid.innerHTML = `<div class="attractions-grid">${rows.map(a => `
      <article class="attraction-card" onclick="window.location.hash='#/attraction/${a.id}'"
        role="button" tabindex="0" aria-label="View ${a.name}"
        onkeydown="if(event.key==='Enter')window.location.hash='#/attraction/${a.id}'">
        <div class="attraction-img-wrap">
          ${a.cover_image || a.first_image
            ? `<img class="attraction-img" src="${a.cover_image || a.first_image}" alt="${a.name}" loading="lazy" />`
            : `<div class="attraction-img-placeholder" aria-hidden="true">${CAT_ICONS[a.category]||'🏝️'}</div>`}
        </div>
        <div class="attraction-body">
          <div class="attraction-cat">${CAT_ICONS[a.category]||''} ${catLabel(a.category)}</div>
          <div class="attraction-name">${a.name}</div>
          <div class="attraction-loc">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${a.city}, ${a.province}
          </div>
          <div class="attraction-footer">
            <div>
              <div class="price-from">From</div>
              <div class="price-val">${a.min_price ? formatIDR(a.min_price) : 'Free'}</div>
            </div>
            <div class="attraction-rating" aria-label="${parseFloat(a.average_rating||0).toFixed(1)} stars">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${parseFloat(a.average_rating||0).toFixed(1)}
            </div>
          </div>
        </div>
      </article>`).join('')}</div>`;
  },
};
