/**
 * Central API client – all HTTP calls go through here.
 */
import { auth } from './auth.js';

const BASE = '/api';

async function request(method, path, data = null, isFormData = false) {
  const token = auth.getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (data) opts.body = isFormData ? data : JSON.stringify(data);

  const res  = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({ success: false, message: 'No response body.' }));

  if (res.status === 401) {
    // Token expired or invalid – redirect to login
    auth.logout();
    window.location.hash = '#/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const msg = json.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data: json });
  }

  return json;
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, data)   => request('POST',   path, data),
  put:    (path, data)   => request('PUT',    path, data),
  delete: (path)         => request('DELETE', path),
  upload: (path, form)   => request('POST',   path, form, true),
  uploadPut:(path, form) => request('PUT',    path, form, true),

  // ── Auth ──────────────────────────────────────────────
  auth: {
    login:          (d)  => request('POST', '/auth/login',           d),
    register:       (d)  => request('POST', '/auth/register',        d),
    me:             ()   => request('GET',  '/auth/me'),
    updateProfile:  (fd) => request('PUT',  '/auth/profile',         fd, true),
    changePassword: (d)  => request('PUT',  '/auth/change-password', d),
  },

  // ── Dashboard ─────────────────────────────────────────
  dashboard: {
    admin:    () => request('GET', '/dashboard/admin'),
    customer: () => request('GET', '/dashboard/customer'),
  },

  // ── Attractions ───────────────────────────────────────
  attractions: {
    list:       (q = '')    => request('GET', `/attractions?${q}`),
    adminList:  (q = '')    => request('GET', `/attractions/admin?${q}`),
    detail:     (id)        => request('GET', `/attractions/${id}`),
    categories: ()          => request('GET', '/attractions/categories'),
    cities:     ()          => request('GET', '/attractions/cities'),
    create:     (fd)        => request('POST',   '/attractions',            fd, true),
    update:     (id, fd)    => request('PUT',    `/attractions/${id}`,      fd, true),
    delete:     (id)        => request('DELETE', `/attractions/${id}`),
    addImage:   (id, fd)    => request('POST',   `/attractions/${id}/images`, fd, true),
    removeImage:(imgId)     => request('DELETE', `/attractions/images/${imgId}`),
  },

  // ── Ticket Types ──────────────────────────────────────
  ticketTypes: {
    byAttraction:   (id)       => request('GET',    `/ticket-types/attraction/${id}`),
    availability:   (id, date) => request('GET',    `/ticket-types/attraction/${id}/availability?date=${date}`),
    create:         (id, d)    => request('POST',   `/ticket-types/attraction/${id}`, d),
    update:         (id, d)    => request('PUT',    `/ticket-types/${id}`, d),
    delete:         (id)       => request('DELETE', `/ticket-types/${id}`),
  },

  // ── Bookings ──────────────────────────────────────────
  bookings: {
    list:     (q = '') => request('GET',  `/bookings?${q}`),
    detail:   (id)     => request('GET',  `/bookings/${id}`),
    create:   (d)      => request('POST', '/bookings', d),
    confirm:  (id)     => request('PUT',  `/bookings/${id}/confirm`),
    cancel:   (id, d)  => request('PUT',  `/bookings/${id}/cancel`, d),
    complete: (id)     => request('PUT',  `/bookings/${id}/complete`),
  },

  // ── Payments ──────────────────────────────────────────
  payments: {
    byBooking:    (bid)    => request('GET',  `/payments/booking/${bid}`),
    createQris:   (id)     => request('POST', `/payments/${id}/create-qris`),
    checkStatus:  (id)     => request('GET',  `/payments/${id}/status`),
    confirmSim:   (id)     => request('POST', `/payments/${id}/confirm-sim`),
    uploadProof:  (id, fd) => request('POST', `/payments/${id}/upload-proof`, fd, true),
    confirm:      (id)     => request('PUT',  `/payments/${id}/confirm`),
    reject:       (id)     => request('PUT',  `/payments/${id}/reject`),
  },

  // ── Tickets ───────────────────────────────────────────
  tickets: {
    mine:              (q = '') => request('GET',  `/tickets?${q}`),
    detail:            (id)     => request('GET',  `/tickets/${id}`),
    byCode:            (code)   => request('GET',  `/tickets/code/${code}`),
    validate:          (d)      => request('POST', '/tickets/validate', d),
    regenerateQR:      (id)     => request('POST', `/tickets/${id}/regenerate-qr`),
    // Admin-only
    adminList:         (q = '') => request('GET',  `/tickets/admin/all?${q}`),
    adminStats:        ()       => request('GET',  '/tickets/admin/stats'),
    adminUpdateStatus: (id, d)  => request('PUT',  `/tickets/admin/${id}/status`, d),
  },

  // ── Customers ─────────────────────────────────────────
  customers: {
    list:       (q = '') => request('GET', `/customers?${q}`),
    detail:     (id)     => request('GET', `/customers/${id}`),
    update:     (id, d)  => request('PUT', `/customers/${id}`, d),
    deactivate: (id)     => request('PUT', `/customers/${id}/deactivate`),
    activate:   (id)     => request('PUT', `/customers/${id}/activate`),
  },

  // ── Promotions ────────────────────────────────────────
  promotions: {
    list:         (q = '') => request('GET',    `/promotions?${q}`),
    detail:       (id)     => request('GET',    `/promotions/${id}`),
    validateCode: (d)      => request('POST',   '/promotions/validate-code', d),
    create:       (d)      => request('POST',   '/promotions', d),
    update:       (id, d)  => request('PUT',    `/promotions/${id}`, d),
    delete:       (id)     => request('DELETE', `/promotions/${id}`),
  },

  // ── Notifications ─────────────────────────────────────
  notifications: {
    list:        (q = '') => request('GET', `/notifications?${q}`),
    unreadCount: ()       => request('GET', '/notifications/unread-count'),
    markRead:    (id)     => request('PUT', `/notifications/${id}/read`),
    markAllRead: ()       => request('PUT', '/notifications/read-all'),
  },

  // ── Reports ───────────────────────────────────────────
  reports: {
    revenue:            (q = '') => request('GET', `/reports/revenue?${q}`),
    visitors:           (q = '') => request('GET', `/reports/visitors?${q}`),
    popularAttractions: (q = '') => request('GET', `/reports/popular-attractions?${q}`),
    ticketSales:        (q = '') => request('GET', `/reports/ticket-sales?${q}`),
    qrScans:            (q = '') => request('GET', `/reports/qr-scans?${q}`),
  },

  // ── QR Management ─────────────────────────────────────
  qr: {
    stats:       ()        => request('GET',    '/admin/qr/stats'),
    list:        (q = '')  => request('GET',    `/admin/qr?${q}`),
    history:     (q = '')  => request('GET',    `/admin/qr/history?${q}`),
    detail:      (id)      => request('GET',    `/admin/qr/${id}`),
    create:      (d)       => request('POST',   '/admin/qr/create', d),
    update:      (id, d)   => request('PUT',    `/admin/qr/${id}`, d),
    delete:      (id)      => request('DELETE', `/admin/qr/${id}`),
    regenerate:  (id)      => request('POST',   `/admin/qr/${id}/regenerate`),
    scan:        (d)       => request('POST',   '/admin/qr/scan', d),
    downloadPng: (id)      => `/api/admin/qr/${id}/download/png`,
    downloadPdf: (id)      => `/api/admin/qr/${id}/download/pdf`,
  },

  // ── Reviews ───────────────────────────────────────────
  reviews: {
    list:   (attractionId, q = '') => request('GET',    `/reviews/${attractionId}/reviews?${q}`),
    create: (attractionId, d)      => request('POST',   `/reviews/${attractionId}/reviews`, d),
    delete: (id)                   => request('DELETE', `/reviews/reviews/${id}`),
  },
};
