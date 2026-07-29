/** Format IDR currency */
export function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

/** Format a date string */
export function formatDate(d, opts = {}) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', ...opts,
  }).format(new Date(d));
}

/** Relative time */
export function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** Query string builder (skip empty) */
export function qs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/** Category icon map */
export const CAT_ICONS = {
  waterpark:        '💧', zoo: '🦁', museum: '🏛️', beach: '🏖️',
  camping:          '⛺', theme_park: '🎡', tourist_village: '🏘️',
  botanical_garden: '🌿', adventure_park: '🧗', event: '🎉',
};

/** Category label */
export function catLabel(cat) {
  return (cat || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Status badge HTML */
export function statusBadge(status) {
  const map = {
    pending:   'badge-warning',
    confirmed: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    refunded:  'badge-gray',
    active:    'badge-success',
    used:      'badge-gray',
    expired:   'badge-danger',
    paid:      'badge-success',
    unpaid:    'badge-warning',
    failed:    'badge-danger',
  };
  return `<span class="badge badge-dot ${map[status] || 'badge-gray'}">${status}</span>`;
}

/** Pagination HTML */
export function paginationHTML(pagination, onPage) {
  if (!pagination || pagination.totalPages <= 1) return '';
  const { page, totalPages } = pagination;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return `<div class="pagination" role="navigation" aria-label="Pagination">
    <button class="page-btn" ${page === 1 ? 'disabled aria-disabled="true"' : ''} data-page="${page - 1}" aria-label="Previous page">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    ${pages.map(p => p === '…'
      ? `<span class="page-btn" style="cursor:default;opacity:.5">…</span>`
      : `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}" aria-label="Page ${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`
    ).join('')}
    <button class="page-btn" ${page === totalPages ? 'disabled aria-disabled="true"' : ''} data-page="${page + 1}" aria-label="Next page">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>`;
}

/** Bind pagination click handlers */
export function bindPagination(container, callback) {
  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p)) callback(p);
    });
  });
}

/** Debounce */
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Empty state HTML (icon-based, no emoji fallback needed) */
export function emptyState(icon, title, message, action = '') {
  return `<div class="empty-state">
    <span class="empty-icon" aria-hidden="true">${icon}</span>
    <div class="empty-title">${title}</div>
    <p class="empty-message">${message}</p>
    ${action}
  </div>`;
}

/** Skeleton row for tables */
export function skeletonRows(cols = 5, rows = 5) {
  return [...Array(rows)].map(() =>
    `<tr>${[...Array(cols)].map(() =>
      `<td><div class="skeleton skeleton-text" style="width:${60 + Math.random()*35|0}%"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

/** Lazy-load image helper – adds loading="lazy" and fade-in */
export function lazyImg(src, alt = '', cls = '', style = '') {
  if (!src) return '';
  return `<img src="${src}" alt="${alt}" loading="lazy" class="${cls}" style="${style}" onload="this.classList.add('loaded')" />`;
}
