// ═══════════════════════════════════════════════════════════════
// HOUSE OF VIYARA — MASTER SYSTEM GUARD & TELEMETRY SURVEILLANCE
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.HOV_SYSTEM_LOGS = JSON.parse(localStorage.getItem('hov_system_logs') || '[]');

    // Global Error & Exception Collector
    function recordSystemError(errorData) {
        const entry = {
            id: 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: new Date().toISOString(),
            page: window.location.pathname || 'index.html',
            type: errorData.type || 'JS_ERROR',
            message: errorData.message || 'Unknown Error',
            source: errorData.source || '',
            lineno: errorData.lineno || 0,
            colno: errorData.colno || 0,
            stack: errorData.stack || '',
            userAgent: navigator.userAgent
        };

        window.HOV_SYSTEM_LOGS.unshift(entry);
        if (window.HOV_SYSTEM_LOGS.length > 100) window.HOV_SYSTEM_LOGS.pop(); // keep last 100
        try {
            localStorage.setItem('hov_system_logs', JSON.stringify(window.HOV_SYSTEM_LOGS));
        } catch(e) {}
    }

    // Catch Uncaught JS Errors
    window.addEventListener('error', function(event) {
        recordSystemError({
            type: 'RUNTIME_ERROR',
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error ? event.error.stack : ''
        });
    });

    // Catch Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', function(event) {
        recordSystemError({
            type: 'UNHANDLED_PROMISE',
            message: event.reason ? (event.reason.message || String(event.reason)) : 'Promise rejected',
            stack: event.reason ? event.reason.stack : ''
        });
    });

    // Master Bypass check
    function isDeveloperSession() {
        return localStorage.getItem('hov_master_authenticated') === 'true' || 
               new URLSearchParams(window.location.search).get('dev_bypass') === 'true';
    }

    // Check Maintenance Mode
    async function checkMaintenanceMode() {
        // Do not block master panel itself
        if (window.location.pathname.includes('master.html')) return;

        let config = null;

        // Try to fetch latest system_config.json from GitHub / local
        try {
            const res = await fetch('data/system_config.json?v=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                config = await res.json();
                localStorage.setItem('hov_system_config', JSON.stringify(config));
            }
        } catch(e) {
            // fallback to localStorage cache
            try {
                config = JSON.parse(localStorage.getItem('hov_system_config'));
            } catch(err) {}
        }

        if (config && config.maintenance_mode === true && !isDeveloperSession()) {
            renderMaintenanceOverlay(config);
        }
    }

    function renderMaintenanceOverlay(config) {
        // Stop DOM loading and display full screen maintenance page
        document.addEventListener('DOMContentLoaded', function() {
            const overlayHtml = `
            <div id="hov-maintenance-overlay" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: #0d0e15; color: #ffffff; z-index: 99999999;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center; padding: 20px; box-sizing: border-box; overflow: auto;
            ">
                <div style="
                    max-width: 600px; width: 100%; background: #161925; border: 2px solid #ff3366;
                    border-radius: 16px; padding: 40px 30px; box-shadow: 0 20px 50px rgba(255, 51, 102, 0.25);
                    position: relative;
                ">
                    <div style="
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 80px; height: 80px; background: rgba(255, 51, 102, 0.1);
                        border-radius: 50%; border: 2px solid #ff3366; margin-bottom: 24px;
                        animation: pulse 2s infinite;
                    ">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff3366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                            <path d="M12 12h.01"></path>
                            <path d="M17 12h.01"></path>
                            <path d="M7 12h.01"></path>
                        </svg>
                    </div>

                    <div style="
                        display: inline-block; background: #ff3366; color: #fff; font-size: 11px;
                        font-weight: 900; letter-spacing: 2px; padding: 4px 12px; border-radius: 20px;
                        text-transform: uppercase; margin-bottom: 16px;
                    ">
                        ● MAINTENANCE MODE ACTIVE
                    </div>

                    <h1 style="font-size: 2rem; font-weight: 800; margin: 0 0 16px 0; color: #ffffff;">
                        ${config.maintenance_title || 'Site Under Maintenance'}
                    </h1>

                    <p style="font-size: 1.05rem; line-height: 1.6; color: #a0aec0; margin: 0 0 24px 0;">
                        ${config.maintenance_message || 'Our website is currently undergoing scheduled maintenance. Please check back shortly.'}
                    </p>

                    ${config.maintenance_estimated_time ? `
                    <div style="
                        background: #0d0e15; border: 1px solid #2d3748; padding: 12px 20px;
                        border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;
                        margin-bottom: 24px; font-size: 0.9rem; color: #e2e8f0;
                    ">
                        <span style="color: #ff3366;">⏳ Estimated Duration:</span> <strong>${config.maintenance_estimated_time}</strong>
                    </div>
                    ` : ''}

                    <div style="margin-top: 20px; border-top: 1px solid #2d3748; padding-top: 20px;">
                        <button onclick="promptDeveloperLogin()" style="
                            background: transparent; border: 1px solid #4a5568; color: #cbd5e0;
                            padding: 8px 16px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;
                            transition: all 0.2s;
                        ">
                            🔑 Developer Access
                        </button>
                    </div>
                </div>
            </div>

            <style>
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(255, 51, 102, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 51, 102, 0); }
                }
            </style>
            `;

            document.body.innerHTML = overlayHtml;
        });
    }

    // Helper for developer unlock on overlay
    window.promptDeveloperLogin = function() {
        const pass = prompt('Enter Master Developer Passcode:');
        if (pass === 'DEV-MASTER-9999') {
            localStorage.setItem('hov_master_authenticated', 'true');
            alert('Developer Bypass Granted! Reloading page...');
            window.location.reload();
        } else if (pass) {
            alert('Invalid Passcode!');
        }
    };

    // Run check immediately
    checkMaintenanceMode();
})();
