/**
 * Auth store – manages JWT + user profile in localStorage.
 */
const TOKEN_KEY = 'wp_token';
const USER_KEY  = 'wp_user';

export const auth = {
  init() {
    // nothing async needed – localStorage is synchronous
  },

  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  getRole() {
    return this.getUser()?.role || null;
  },

  isAdmin() {
    return this.getRole() === 'admin';
  },

  isCustomer() {
    return this.getRole() === 'customer';
  },

  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
