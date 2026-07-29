/**
 * Skeleton loading components
 * Usage:
 *   import { renderTableSkeleton, renderCardSkeleton } from '../components/skeleton.js';
 *   el.innerHTML = renderTableSkeleton(5, 4);
 *   el.innerHTML = renderCardSkeleton(3);
 */

/**
 * Render a table skeleton with shimmer rows.
 * @param {number} rows  - number of body rows (default 5)
 * @param {number} cols  - number of columns  (default 4)
 * @returns {string} HTML string
 */
export function renderTableSkeleton(rows = 5, cols = 4) {
  const headerCells = Array.from({ length: cols }, () =>
    `<th><div class="skeleton-shimmer" style="height:14px;width:${60 + Math.random() * 30 | 0}%;border-radius:4px"></div></th>`
  ).join('');

  const bodyRows = Array.from({ length: rows }, () => {
    const cells = Array.from({ length: cols }, (_, i) => {
      const w = i === 0 ? '80%' : `${40 + Math.random() * 50 | 0}%`;
      return `<td><div class="skeleton-shimmer" style="height:13px;width:${w};border-radius:4px"></div></td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div style="overflow-x:auto">
      <table class="table" style="width:100%">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

/**
 * Render a row of stat/info card skeletons.
 * @param {number} count - number of cards (default 3)
 * @returns {string} HTML string
 */
export function renderCardSkeleton(count = 3) {
  const cards = Array.from({ length: count }, () => `
    <div class="stat-card">
      <div class="skeleton-shimmer" style="width:44px;height:44px;border-radius:var(--radius);flex-shrink:0"></div>
      <div class="stat-info" style="flex:1;display:flex;flex-direction:column;gap:8px">
        <div class="skeleton-shimmer" style="height:12px;width:70%;border-radius:4px"></div>
        <div class="skeleton-shimmer" style="height:26px;width:50%;border-radius:4px"></div>
      </div>
    </div>`).join('');

  return `<div class="stat-grid" style="grid-template-columns:repeat(${count},1fr)">${cards}</div>`;
}

/**
 * Render a list of skeleton rows (for generic lists or feed items).
 * @param {number} count - number of rows (default 5)
 * @returns {string} HTML string
 */
export function renderListSkeleton(count = 5) {
  return Array.from({ length: count }, () => `
    <div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-subtle)">
      <div class="skeleton-shimmer" style="width:36px;height:36px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:7px">
        <div class="skeleton-shimmer" style="height:13px;width:65%;border-radius:4px"></div>
        <div class="skeleton-shimmer" style="height:11px;width:40%;border-radius:4px"></div>
      </div>
      <div class="skeleton-shimmer" style="height:13px;width:80px;border-radius:4px"></div>
    </div>`).join('');
}
