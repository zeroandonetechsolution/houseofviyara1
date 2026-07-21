// ═══════════════════════════════════════════════════════════════
// HOUSE OF VIYARA — MASTER SYSTEM GUARD v3.0
// Bulletproof maintenance blocking & telemetry surveillance
// ═══════════════════════════════════════════════════════════════
(function () {
    'use strict';

    const IS_MASTER_PAGE = window.location.pathname.includes('master.html');

    // ── TELEMETRY: Error Collector ──────────────────────────────
    window.HOV_SYSTEM_LOGS = JSON.parse(localStorage.getItem('hov_system_logs') || '[]');

    function recordError(data) {
        const entry = {
            id: 'e_' + Date.now(),
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            type: data.type || 'JS_ERROR',
            message: data.message || '',
            source: data.source || '',
            lineno: data.lineno || 0,
            stack: data.stack || ''
        };
        window.HOV_SYSTEM_LOGS.unshift(entry);
        if (window.HOV_SYSTEM_LOGS.length > 200) window.HOV_SYSTEM_LOGS.length = 200;
        try { localStorage.setItem('hov_system_logs', JSON.stringify(window.HOV_SYSTEM_LOGS)); } catch (e) { }
    }

    if (!IS_MASTER_PAGE) {
        window.addEventListener('error', function (e) {
            recordError({ type: 'RUNTIME_ERROR', message: e.message, source: e.filename, lineno: e.lineno, stack: e.error ? e.error.stack : '' });
        });
        window.addEventListener('unhandledrejection', function (e) {
            recordError({ type: 'PROMISE_REJECTION', message: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled rejection', stack: e.reason ? e.reason.stack : '' });
        });
    }

    // ── DEVELOPER CHECK ─────────────────────────────────────────
    function isDevSession() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('test_maintenance') === '1') return false; // force visitor view
        return localStorage.getItem('hov_master_auth') === 'true';
    }

    // ── SECRET KEYPRESS UNLOCK (type "master" on keyboard) ──────
    let keyBuf = '';
    document.addEventListener('keydown', function (e) {
        keyBuf = (keyBuf + e.key).slice(-10).toLowerCase();
        if (keyBuf.endsWith('master')) {
            keyBuf = '';
            const p = prompt('Enter Developer Passcode:');
            const validPasses = ['DEV-MASTER-9999', 'mosakutty'];
            if (validPasses.includes(p)) {
                localStorage.setItem('hov_master_auth', 'true');
                location.reload();
            } else if (p !== null) {
                alert('Wrong passcode.');
            }
        }
    });

    if (IS_MASTER_PAGE) return; // master.html is never blocked

    // ── MAINTENANCE CHECK & BLOCKING ────────────────────────────

    // Step 1: Immediately check cached state — hide page if blocked
    let cachedCfg = null;
    try { cachedCfg = JSON.parse(localStorage.getItem('hov_sys_cfg') || 'null'); } catch (e) { }

    if (cachedCfg && cachedCfg.maintenance_mode && !isDevSession()) {
        // Hide page instantly while we verify with server
        document.documentElement.style.visibility = 'hidden';
    }

    // Step 2: Fetch latest config from server
    async function fetchConfig() {
        const paths = [
            '/data/system_config.json',
            'data/system_config.json',
            '../data/system_config.json'
        ];
        for (const p of paths) {
            try {
                const r = await fetch(p + '?_=' + Date.now(), { cache: 'no-store' });
                if (r.ok) {
                    const cfg = await r.json();
                    localStorage.setItem('hov_sys_cfg', JSON.stringify(cfg));
                    return cfg;
                }
            } catch (e) { }
        }
        return cachedCfg; // fallback to cached
    }

    // Step 3: Apply decision
    async function applyMaintenanceCheck() {
        const cfg = await fetchConfig();

        if (cfg && cfg.maintenance_mode === true && !isDevSession()) {
            showMaintenanceOverlay(cfg);
        } else {
            // Site is ONLINE — make page visible
            document.documentElement.style.visibility = '';
        }
    }

    function showMaintenanceOverlay(cfg) {
        const title = cfg.maintenance_title || 'SITE UNDER MAINTENANCE';
        const message = cfg.maintenance_message || 'House of Viyara is currently undergoing scheduled maintenance. We\'ll be back soon!';
        const eta = cfg.maintenance_estimated_time || '';

        const html = `
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
  body{background:#f4f4f4;font-family:'Outfit',sans-serif;min-height:100vh;display:flex;flex-direction:column;overflow-x:hidden}
  .hov-ticker{width:100%;background:#FFE500;border-bottom:4px solid #000;padding:11px 20px;font-weight:900;font-size:0.9rem;letter-spacing:1.5px;text-align:center;text-transform:uppercase;color:#000}
  .hov-header{padding:36px 20px 16px;text-align:center}
  .hov-logo{display:inline-block;background:#FFE500;border:4px solid #000;box-shadow:6px 6px 0 #000;padding:14px 28px;font-size:1.8rem;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#000}
  .hov-card{max-width:640px;width:90%;background:#fff;border:4px solid #000;box-shadow:10px 10px 0 #000;padding:44px 36px;margin:16px auto 60px;text-align:center}
  .hov-badge{display:inline-block;background:#FF007A;color:#fff;border:3px solid #000;box-shadow:4px 4px 0 #000;font-size:11px;font-weight:900;letter-spacing:2px;padding:6px 16px;text-transform:uppercase;margin-bottom:24px}
  .hov-title{font-size:2.4rem;font-weight:900;margin:0 0 20px;color:#000;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.15}
  .hov-msg{font-size:1.05rem;line-height:1.75;color:#333;margin:0 0 32px;font-weight:600}
  .hov-eta{background:#FFE500;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:14px 24px;display:inline-flex;align-items:center;gap:10px;font-size:0.95rem;font-weight:800;color:#000;text-transform:uppercase}
  .hov-eta strong{background:#000;color:#FFE500;padding:3px 10px;border-radius:4px}
  .hov-footer{margin-top:40px;padding-top:24px;border-top:2px dashed #000;font-size:0.85rem;color:#666;font-weight:700;text-transform:uppercase}
  @keyframes hovBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  .hov-icon{display:inline-block;font-size:3rem;animation:hovBounce 2s infinite}
</style>
<div class="hov-ticker">✨ HOUSE OF VIYARA — OFFICIAL ANNOUNCEMENT ✨</div>
<div class="hov-header"><div class="hov-logo">HOUSE OF VIYARA</div></div>
<div class="hov-card">
  <div class="hov-icon">🔧</div>
  <br><br>
  <div class="hov-badge">● WEBSITE IS TEMPORARILY OFFLINE</div>
  <h1 class="hov-title">${title}</h1>
  <p class="hov-msg">${message}</p>
  ${eta ? `<div class="hov-eta">⏳ BACK ONLINE IN: <strong>${eta}</strong></div>` : ''}
  <div class="hov-footer">💖 Thank you for your patience — House of Viyara</div>
</div>`;

        function apply() {
            document.head.innerHTML = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>House Of Viyara — Maintenance</title>';
            document.body.innerHTML = html;
            document.documentElement.style.visibility = '';
            document.documentElement.style.overflow = 'auto';
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', apply);
        } else {
            apply();
        }
    }

    applyMaintenanceCheck();

})();
