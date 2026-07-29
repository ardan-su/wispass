/**
 * Admin – Gate Scanner Page
 * Real-time QR scanning for gate officers.
 * Uses the device camera (via getUserMedia) or manual paste input.
 */
import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { socket } from '../components/socket.js';

// ─── Sound effects (beep) ────────────────────────────────────────────────────
function beep(type = 'success') {
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const osc   = ctx.createOscillator();
    const gain  = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1108, ctx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
    }
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

// ─── QR Code decoder (using jsQR library via CDN script) ─────────────────────
async function loadJsQR() {
  if (window.jsQR) return window.jsQR;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    s.onload  = () => resolve(window.jsQR);
    s.onerror = () => reject(new Error('Failed to load QR scanner library'));
    document.head.appendChild(s);
  });
}

export default {
  _stream: null,
  _scanning: false,
  _jsQR: null,
  _scanCooldown: false,

  async render(el) {
    setPageTitle('Gate Scanner');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Gate Scanner</span></div>
          <h2>🎫 Gate QR Scanner</h2>
        </div>
        <div class="page-header-actions">
          <span id="socket-status" class="badge badge-secondary">⚡ Connecting…</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start">
        <!-- Left: camera + manual input -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Camera card -->
          <div class="card" style="padding:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <h3 style="margin:0;font-size:1rem">Camera Scanner</h3>
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" id="start-cam-btn">▶ Start Camera</button>
                <button class="btn btn-secondary btn-sm" id="stop-cam-btn" disabled>⏹ Stop</button>
              </div>
            </div>
            <div style="position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center">
              <video id="cam-video" style="width:100%;height:100%;object-fit:cover;display:none" autoplay muted playsinline></video>
              <canvas id="cam-canvas" style="display:none"></canvas>
              <div id="cam-placeholder" style="color:#666;font-size:.875rem;text-align:center;padding:40px">
                <div style="font-size:3rem;margin-bottom:12px">📷</div>
                <div>Click "Start Camera" to begin scanning</div>
              </div>
              <!-- Scan overlay -->
              <div id="scan-overlay" style="display:none;position:absolute;inset:0;pointer-events:none">
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                  width:200px;height:200px;border:2px solid rgba(99,102,241,.8);border-radius:12px;
                  box-shadow:0 0 0 9999px rgba(0,0,0,.4)">
                  <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-top:4px solid #6366f1;border-left:4px solid #6366f1;border-radius:4px 0 0 0"></div>
                  <div style="position:absolute;top:-2px;right:-2px;width:24px;height:24px;border-top:4px solid #6366f1;border-right:4px solid #6366f1;border-radius:0 4px 0 0"></div>
                  <div style="position:absolute;bottom:-2px;left:-2px;width:24px;height:24px;border-bottom:4px solid #6366f1;border-left:4px solid #6366f1;border-radius:0 0 0 4px"></div>
                  <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-bottom:4px solid #6366f1;border-right:4px solid #6366f1;border-radius:0 0 4px 0"></div>
                  <!-- Laser scan line -->
                  <div id="scan-laser" style="position:absolute;top:0;left:4px;right:4px;height:2px;background:linear-gradient(90deg,transparent,#6366f1,transparent);animation:laserScan 1.8s ease-in-out infinite"></div>
                </div>
              </div>
            </div>
            <div id="cam-status" style="text-align:center;font-size:.8125rem;color:var(--text-tertiary);margin-top:10px">Camera inactive</div>
          </div>

          <!-- Manual input card -->
          <div class="card" style="padding:20px">
            <h3 style="margin:0 0 14px;font-size:1rem">Manual QR Input</h3>
            <p style="font-size:.8125rem;color:var(--text-secondary);margin:0 0 12px">Paste raw QR data or ticket code:</p>
            <div style="display:flex;gap:10px">
              <input id="manual-input" type="text" class="form-control" placeholder="Paste QR data or ticket code…" style="flex:1;font-family:monospace;font-size:.8125rem">
              <button class="btn btn-primary" id="manual-submit-btn">Validate</button>
            </div>
          </div>
        </div>

        <!-- Right: result + activity feed -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Result card -->
          <div class="card" id="result-card" style="padding:24px;text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center">
            <div id="result-idle">
              <div style="font-size:3.5rem;margin-bottom:12px">🎯</div>
              <div style="font-size:1rem;font-weight:600;color:var(--text-secondary)">Waiting for scan…</div>
            </div>
          </div>

          <!-- Session counter -->
          <div class="card" style="padding:16px">
            <div style="text-align:center">
              <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:6px">Session Scans</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
                <div>
                  <div style="font-size:1.75rem;font-weight:800;color:var(--success)" id="count-valid">0</div>
                  <div style="font-size:.7rem;color:var(--text-tertiary)">Valid</div>
                </div>
                <div>
                  <div style="font-size:1.75rem;font-weight:800;color:var(--danger)" id="count-invalid">0</div>
                  <div style="font-size:.7rem;color:var(--text-tertiary)">Invalid</div>
                </div>
                <div>
                  <div style="font-size:1.75rem;font-weight:800;color:var(--text-secondary)" id="count-total">0</div>
                  <div style="font-size:.7rem;color:var(--text-tertiary)">Total</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" id="reset-counts-btn" style="margin-top:10px">Reset counters</button>
            </div>
          </div>

          <!-- Activity feed -->
          <div class="card" style="padding:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-size:.875rem;font-weight:600">Recent Activity</span>
              <button class="btn btn-ghost btn-sm" id="clear-feed-btn">Clear</button>
            </div>
            <div id="activity-feed" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
              <div style="font-size:.8125rem;color:var(--text-tertiary);text-align:center;padding:20px 0">No scans yet this session</div>
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes laserScan { 0%,100% { top:4px; } 50% { top:calc(100% - 6px); } }
        @keyframes resultPop { 0% { transform:scale(.85); opacity:0; } 70% { transform:scale(1.05); } 100% { transform:scale(1); opacity:1; } }
        .result-anim { animation: resultPop .35s cubic-bezier(.4,0,.2,1) both; }
      </style>`;

    this._counts = { valid: 0, invalid: 0, total: 0 };
    this._bindEvents(el);
    this._connectSocket(el);
    this._jsQR = await loadJsQR().catch(() => null);
  },

  _bindEvents(el) {
    // Camera
    el.querySelector('#start-cam-btn').onclick = () => this._startCamera(el);
    el.querySelector('#stop-cam-btn').onclick  = () => this._stopCamera(el);

    // Manual
    el.querySelector('#manual-submit-btn').onclick = () => this._manualValidate(el);
    el.querySelector('#manual-input').onkeydown = (e) => {
      if (e.key === 'Enter') this._manualValidate(el);
    };

    // Counters
    el.querySelector('#reset-counts-btn').onclick = () => {
      this._counts = { valid: 0, invalid: 0, total: 0 };
      el.querySelector('#count-valid').textContent   = '0';
      el.querySelector('#count-invalid').textContent = '0';
      el.querySelector('#count-total').textContent   = '0';
    };
    el.querySelector('#clear-feed-btn').onclick = () => {
      el.querySelector('#activity-feed').innerHTML = `<div style="font-size:.8125rem;color:var(--text-tertiary);text-align:center;padding:20px 0">No scans yet this session</div>`;
    };

    // Cleanup on navigation
    window.addEventListener('hashchange', () => this._stopCamera(el), { once: true });
  },

  _connectSocket(el) {
    try {
      const { auth } = window._wisataAuthModule || {};
      const tok = localStorage.getItem('wp_token');
      if (tok) {
        socket.connect(tok);
        socket.on('qr:scanned', (data) => {
          el.querySelector('#socket-status').className = 'badge badge-success';
          el.querySelector('#socket-status').textContent = '🟢 Live';
        });
        el.querySelector('#socket-status').className  = 'badge badge-success';
        el.querySelector('#socket-status').textContent = '🟢 Live';
      }
    } catch (_) {}
  },

  async _startCamera(el) {
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const video = el.querySelector('#cam-video');
      video.srcObject = this._stream;
      video.style.display = 'block';
      el.querySelector('#cam-placeholder').style.display = 'none';
      el.querySelector('#scan-overlay').style.display    = 'block';
      el.querySelector('#start-cam-btn').disabled = true;
      el.querySelector('#stop-cam-btn').disabled  = false;
      el.querySelector('#cam-status').textContent = '🔴 Scanning…';
      this._scanning = true;
      this._scanLoop(el, video);
    } catch (err) {
      window.toast?.error('Camera error', err.message.includes('denied') ? 'Camera permission denied. Use manual input.' : err.message);
    }
  },

  _stopCamera(el) {
    this._scanning = false;
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    const video = el.querySelector('#cam-video');
    if (video) { video.srcObject = null; video.style.display = 'none'; }
    const ph = el.querySelector('#cam-placeholder');
    if (ph) ph.style.display = 'flex';
    const ov = el.querySelector('#scan-overlay');
    if (ov) ov.style.display = 'none';
    const stBtn = el.querySelector('#start-cam-btn');
    if (stBtn) stBtn.disabled = false;
    const spBtn = el.querySelector('#stop-cam-btn');
    if (spBtn) spBtn.disabled = true;
    const st = el.querySelector('#cam-status');
    if (st) st.textContent = 'Camera inactive';
  },

  _scanLoop(el, video) {
    if (!this._scanning || !this._jsQR) return;
    const canvas = el.querySelector('#cam-canvas');
    const ctx    = canvas.getContext('2d');

    const tick = () => {
      if (!this._scanning) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code    = this._jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
        if (code && !this._scanCooldown) {
          this._scanCooldown = true;
          this._processQR(el, code.data).finally(() => {
            setTimeout(() => { this._scanCooldown = false; }, 3000); // 3s cooldown
          });
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  async _manualValidate(el) {
    const input = el.querySelector('#manual-input');
    const raw   = input.value.trim();
    if (!raw) return;
    input.value = '';
    await this._processQR(el, raw);
  },

  async _processQR(el, rawData) {
    const btn = el.querySelector('#manual-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Scanning…'; }

    this._showResultLoading(el);

    try {
      const res = await api.qr.scan({ qrData: rawData });
      this._showResult(el, res);
      this._addFeedItem(el, res);
      this._updateCounts(el, res.result === 'valid' ? 'valid' : 'invalid');
      beep(res.result === 'valid' ? 'success' : 'error');
    } catch (err) {
      const errorResult = {
        success:      false,
        result:       err.data?.result || 'invalid',
        message:      err.message,
        status:       'invalid',
        scan_time:    new Date().toISOString(),
      };
      this._showResult(el, errorResult);
      this._addFeedItem(el, errorResult);
      this._updateCounts(el, 'invalid');
      beep('error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Validate'; }
    }
  },

  _showResultLoading(el) {
    el.querySelector('#result-card').innerHTML = `
      <div style="text-align:center">
        <div class="spinner" style="margin:0 auto 16px"></div>
        <div style="color:var(--text-secondary);font-size:.875rem">Validating QR code…</div>
      </div>`;
  },

  _showResult(el, res) {
    const isValid = res.result === 'valid';
    const bg      = isValid ? 'linear-gradient(135deg,#22c55e22,#16a34a11)' : 'linear-gradient(135deg,#ef444422,#dc262611)';
    const color   = isValid ? 'var(--success)' : 'var(--danger)';
    const icon    = isValid ? '✅' : (res.result === 'expired' ? '⏱️' : res.result === 'used' ? '🔁' : '❌');
    const time    = res.scan_time ? new Date(res.scan_time).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID');

    el.querySelector('#result-card').innerHTML = `
      <div class="result-anim" style="width:100%;padding:8px;background:${bg};border-radius:12px;border:2px solid ${isValid ? '#22c55e44' : '#ef444444'}">
        <div style="font-size:4rem;margin-bottom:10px">${icon}</div>
        <div style="font-size:1.35rem;font-weight:800;color:${color};margin-bottom:6px">
          ${isValid ? 'ACCESS GRANTED' : (res.result === 'expired' ? 'QR EXPIRED' : res.result === 'used' ? 'ALREADY USED' : 'ACCESS DENIED')}
        </div>
        ${res.visitor_name ? `<div style="font-size:1rem;font-weight:600;color:var(--text-primary);margin-bottom:4px">👤 ${res.visitor_name}</div>` : ''}
        ${res.ticket_type  ? `<div style="font-size:.875rem;color:var(--text-secondary);margin-bottom:4px">🎫 ${res.ticket_type}</div>` : ''}
        ${res.site_name    ? `<div style="font-size:.8125rem;color:var(--text-tertiary);margin-bottom:8px">📍 ${res.site_name}</div>` : ''}
        <div style="font-size:.8125rem;color:var(--text-tertiary)">${res.message || ''}</div>
        <div style="font-size:.75rem;color:var(--text-tertiary);margin-top:6px">🕐 ${time}</div>
        ${res.scans_remaining !== undefined ? `<div style="font-size:.75rem;color:var(--text-tertiary);margin-top:4px">Remaining: ${res.scans_remaining} scan(s)</div>` : ''}
      </div>`;
  },

  _addFeedItem(el, res) {
    const feed = el.querySelector('#activity-feed');
    // Remove "no scans" placeholder
    if (feed.querySelector('div[style*="No scans"]')) feed.innerHTML = '';

    const isValid = res.result === 'valid';
    const icon    = isValid ? '✅' : (res.result === 'expired' ? '⏱️' : res.result === 'used' ? '🔁' : '❌');
    const time    = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = document.createElement('div');
    item.style.cssText = `display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--surface-2);font-size:.8rem;animation:resultPop .25s ease both`;
    item.innerHTML = `
      <span style="font-size:1.1rem;flex-shrink:0">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;color:${isValid ? 'var(--success)' : 'var(--danger)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${res.visitor_name || res.message || res.result}
        </div>
        ${res.ticket_type ? `<div style="color:var(--text-tertiary);font-size:.72rem">${res.ticket_type}</div>` : ''}
      </div>
      <span style="color:var(--text-tertiary);font-size:.7rem;flex-shrink:0">${time}</span>`;
    feed.prepend(item);
    // Keep max 20 items
    while (feed.children.length > 20) feed.removeChild(feed.lastChild);
  },

  _updateCounts(el, type) {
    this._counts.total++;
    if (type === 'valid')   this._counts.valid++;
    else                    this._counts.invalid++;
    el.querySelector('#count-valid').textContent   = this._counts.valid;
    el.querySelector('#count-invalid').textContent = this._counts.invalid;
    el.querySelector('#count-total').textContent   = this._counts.total;
  },
};
