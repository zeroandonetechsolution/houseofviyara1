// ═══════════════════════════════════════════════════════════════
// HOUSE OF VIYARA — MASTER SYSTEM GUARD & TELEMETRY SURVEILLANCE
// ═══════════════════════════════════════════════════════════════

(function () {
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
        if (window.HOV_SYSTEM_LOGS.length > 100) window.HOV_SYSTEM_LOGS.pop();
        try {
            localStorage.setItem('hov_system_logs', JSON.stringify(window.HOV_SYSTEM_LOGS));
        } catch (e) { }
    }

    // Catch Uncaught JS Errors
    window.addEventListener('error', function (event) {
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
    window.addEventListener('unhandledrejection', function (event) {
        recordSystemError({
            type: 'UNHANDLED_PROMISE',
            message: event.reason ? (event.reason.message || String(event.reason)) : 'Promise rejected',
            stack: event.reason ? event.reason.stack : ''
        });
    });

    // Master Bypass check
    function isDeveloperSession() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test_maintenance') === 'true') return false; // Force preview mode
        if (urlParams.get('dev_bypass') === 'true') return true;
        return localStorage.getItem('hov_master_authenticated') === 'true';
    }

    // Secret key listener for developer (Press 'm' + 'a' + 's' + 't' + 'e' + 'r' anywhere on maintenance screen)
    let secretBuffer = '';
    window.addEventListener('keydown', function (e) {
        secretBuffer += e.key.toLowerCase();
        if (secretBuffer.length > 10) secretBuffer = secretBuffer.slice(-10);
        if (secretBuffer.includes('master') || secretBuffer.includes('devpass')) {
            secretBuffer = '';
            const pass = prompt('Enter Master Developer Passcode:');
            if (pass === 'mosakutty') {
                localStorage.setItem('hov_master_authenticated', 'true');
                alert('Developer Bypass Granted! Reloading page...');
                window.location.reload();
            }
        }
    });

    // Check Maintenance Mode
    async function checkMaintenanceMode() {
        if (window.location.pathname.includes('master.html')) return;

        let config = null;
        const pathsToTry = [
            '/data/system_config.json',
            'data/system_config.json',
            '../data/system_config.json'
        ];

        for (const p of pathsToTry) {
            try {
                const res = await fetch(p + '?v=' + Date.now(), { cache: 'no-store' });
                if (res.ok) {
                    config = await res.json();
                    localStorage.setItem('hov_system_config', JSON.stringify(config));
                    break;
                }
            } catch (e) { }
        }

        if (!config) {
            try {
                config = JSON.parse(localStorage.getItem('hov_system_config'));
            } catch (err) { }
        }

        if (config && config.maintenance_mode === true && !isDeveloperSession()) {
            renderMaintenanceOverlay(config);
        }
    }

    function renderMaintenanceOverlay(config) {
        const overlayHtml = `
        <div id="hov-maintenance-overlay" style="
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #f4f4f4; color: #000000; z-index: 999999999;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
            font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
            box-sizing: border-box; overflow-y: auto; overflow-x: hidden;
        ">
            <!-- Top Announcement Ticker -->
            <div style="
                width: 100%; background: #FFE500; border-bottom: 4px solid #000;
                padding: 12px 20px; font-weight: 900; font-size: 0.9rem; letter-spacing: 1.5px;
                text-align: center; text-transform: uppercase; color: #000;
                box-shadow: 0 4px 0 #000;
            ">
                ✨ HOUSE OF VIYARA — OFFICIAL SYSTEM ANNOUNCEMENT ✨
            </div>

            <!-- Header Brand Logo -->
            <div style="padding: 40px 20px 20px 20px; text-align: center;">
                <div style="
                    display: inline-block; background: #FFE500; border: 4px solid #000;
                    box-shadow: 6px 6px 0px #000; padding: 14px 28px; font-size: 1.8rem;
                    font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000;
                ">
                    HOUSE OF VIYARA
                </div>
            </div>

            <!-- Maintenance Card Content -->
            <div style="
                max-width: 620px; width: 90%; background: #ffffff; border: 4px solid #000;
                box-shadow: 10px 10px 0px #000; padding: 40px 32px; margin: 20px auto 40px auto;
                text-align: center; box-sizing: border-box;
            ">
                <div style="
                    display: inline-block; background: #FF007A; color: #ffffff;
                    border: 3px solid #000; box-shadow: 4px 4px 0px #000; font-size: 11px;
                    font-weight: 900; letter-spacing: 2px; padding: 6px 16px; text-transform: uppercase;
                    margin-bottom: 24px;
                ">
                    ● SITE CURRENTLY OFFLINE
                </div>

                <h1 style="
                    font-size: 2.2rem; font-weight: 900; margin: 0 0 18px 0; color: #000000;
                    text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.2;
                ">
                    ${config.maintenance_title || 'SITE UNDER MAINTENANCE'}
                </h1>

                <p style="
                    font-size: 1.1rem; line-height: 1.7; color: #333333; margin: 0 0 28px 0;
                    font-weight: 600;
                ">
                    ${config.maintenance_message || 'House of Viyara is currently undergoing scheduled system upgrades. We will be back online shortly! Thank you for your patience.'}
                </p>

                ${config.maintenance_estimated_time ? `
                <div style="
                    background: #FFE500; border: 3px solid #000; box-shadow: 4px 4px 0px #000;
                    padding: 14px 24px; display: inline-flex; align-items: center; gap: 10px;
                    font-size: 1rem; font-weight: 800; color: #000; text-transform: uppercase;
                ">
                    <span>⏳ ESTIMATED BACK ONLINE:</span> <span style="background: #000; color: #FFE500; padding: 2px 8px; border-radius: 4px;">${config.maintenance_estimated_time}</span>
                </div>
                ` : ''}

                <div style="
                    margin-top: 36px; padding-top: 24px; border-top: 2px dashed #000;
                    font-size: 0.85rem; color: #666; font-weight: 700; text-transform: uppercase;
                ">
                    💖 Thank you for shopping with House of Viyara
                </div>
            </div>
        </div>
        `;

        function applyOverlay() {
            if (document.body) {
                document.body.innerHTML = overlayHtml;
                document.documentElement.style.overflow = 'hidden';
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyOverlay);
        } else {
            applyOverlay();
        }
    }

    checkMaintenanceMode();
})();
