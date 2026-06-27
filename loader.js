/**
 * House Of Viyara — Site-wide loading system
 * Tracks critical assets, lazy-loads heavy media, animated preloader
 */
(function () {
    'use strict';

    const MIN_DISPLAY_MS = 100;
    const MAX_WAIT_MS = 1500;
    const startTime = performance.now();

    let currentProgress = 0;
    let targetProgress = 0;
    let progressRAF = null;
    let hidden = false;
    let lazyObserver = null;

    const preloader = document.getElementById('preloader');
    const bar = document.getElementById('loader-bar');
    const percentEl = document.getElementById('loader-percent');
    const textEl = document.getElementById('loader-text');

    document.documentElement.classList.add('is-loading');

    function setStatus(label) {
        if (textEl) textEl.textContent = label;
    }

    function animateProgress() {
        if (currentProgress < targetProgress) {
            currentProgress = Math.min(targetProgress, currentProgress + 2.5);
            if (bar) bar.style.width = currentProgress + '%';
            if (percentEl) percentEl.textContent = Math.round(currentProgress) + '%';
        }
        if (!hidden && currentProgress < 100) {
            progressRAF = requestAnimationFrame(animateProgress);
        }
    }

    function bumpProgress(amount, label) {
        targetProgress = Math.min(100, targetProgress + amount);
        if (label) setStatus(label);
        if (!progressRAF) progressRAF = requestAnimationFrame(animateProgress);
    }

    function trackPromise(promise, amount, label) {
        bumpProgress(0, label);
        return promise
            .then(() => bumpProgress(amount))
            .catch(() => bumpProgress(amount * 0.5));
    }

    function waitForFonts() {
        if (!document.fonts || !document.fonts.ready) return Promise.resolve();
        return document.fonts.ready;
    }

    function waitForImages(selector) {
        const images = Array.from(document.querySelectorAll(selector));
        if (!images.length) return Promise.resolve();

        return Promise.all(
            images.map((img) => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                });
            })
        );
    }

    function hidePreloader() {
        if (hidden) return;
        hidden = true;

        targetProgress = 100;
        currentProgress = 100;
        if (bar) bar.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        setStatus('Welcome');

        const elapsed = performance.now() - startTime;
        const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);

        setTimeout(() => {
            document.documentElement.classList.remove('is-loading');
            document.documentElement.classList.add('is-loaded');
            if (preloader) {
                preloader.classList.add('fade-out');
                preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
            }
            initLazyMedia();
            initPageTransitions();
        }, delay);
    }

    function scheduleHide() {
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(0, MAX_WAIT_MS - elapsed);
        setTimeout(hidePreloader, remaining);
    }

    // --- Image URL optimization ---
    function optimizeImageUrl(url, width = 400, quality = 60) {
        if (!url) return url;
        if (url.includes('unsplash.com')) {
            let optimized = url.includes('?') ? url : url + '?w=' + width + '&q=' + quality;
            optimized = optimized.replace(/w=\d+/, 'w=' + width).replace(/q=\d+/, 'q=' + quality);
            if (!optimized.includes('w=')) optimized += (optimized.includes('?') ? '&' : '?') + 'w=' + width;
            if (!optimized.includes('q=')) optimized += '&q=' + quality;
            return optimized;
        }
        return url;
    }

    function thumbUrl(url) {
        return optimizeImageUrl(url, 80, 40);
    }

    // --- Lazy media loading ---
    function loadLazyElement(el) {
        if (el.dataset.loaded === 'true') return;
        el.dataset.loaded = 'true';

        if (el.tagName === 'IMG' && el.dataset.src) {
            const fullSrc = el.dataset.src;
            const img = new Image();
            img.onload = () => {
                el.src = fullSrc;
                el.classList.add('lazy-loaded');
                el.classList.remove('lazy-loading');
            };
            img.onerror = () => {
                el.classList.add('lazy-error');
                el.classList.remove('lazy-loading');
            };
            img.src = fullSrc;
        } else if (el.tagName === 'VIDEO' && el.dataset.src) {
            const source = el.querySelector('source') || document.createElement('source');
            source.src = el.dataset.src;
            source.type = 'video/mp4';
            if (!source.parentElement) el.appendChild(source);
            el.load();
            el.classList.add('lazy-loaded');
            el.classList.remove('lazy-loading');
        } else if (el.dataset.bg) {
            el.style.backgroundImage = 'url(' + el.dataset.bg + ')';
            el.classList.add('lazy-loaded');
        }
    }

    function initLazyMedia(root) {
        const scope = root || document;
        const targets = scope.querySelectorAll('[data-src], [data-bg], video[data-src]');

        if (!lazyObserver) {
            lazyObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            loadLazyElement(entry.target);
                            lazyObserver.unobserve(entry.target);
                        }
                    });
                },
                { rootMargin: '200px 0px', threshold: 0.01 }
            );
        }

        targets.forEach((el) => {
            if (el.dataset.loaded !== 'true') lazyObserver.observe(el);
        });
    }

    function preloadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = img.onerror = resolve;
            img.src = src;
        });
    }

    // --- Page transition overlay ---
    function initPageTransitions() {
        const isInternal = (href) => {
            try {
                const url = new URL(href, window.location.origin);
                return url.origin === window.location.origin && !href.startsWith('#') && !href.startsWith('javascript:');
            } catch {
                return false;
            }
        };

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link || link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
            if (!isInternal(link.getAttribute('href'))) return;

            const overlay = document.getElementById('page-transition');
            if (!overlay) return;

            e.preventDefault();
            overlay.classList.add('active');
            setTimeout(() => {
                window.location.href = link.href;
            }, 120);
        });
    }

    function showPageLoader(label) {
        const overlay = document.getElementById('page-transition');
        if (overlay) {
            const txt = overlay.querySelector('.page-transition-text');
            if (txt && label) txt.textContent = label;
            overlay.classList.add('active');
        }
    }

    function hidePageLoader() {
        const overlay = document.getElementById('page-transition');
        if (overlay) overlay.classList.remove('active');
    }

    // --- Boot sequence ---
    bumpProgress(8, 'Initializing...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        onDOMReady();
    }

    function onDOMReady() {
        bumpProgress(25, 'Loading layout...');
        initLazyMedia();

        // Don't wait for everything, hide preloader quickly
        setTimeout(() => {
            bumpProgress(50, 'Almost ready...');
            hidePreloader();
        }, 200);

        // Track remaining resources in background
        trackPromise(waitForFonts(), 10, '');
        trackPromise(waitForImages('img[loading="eager"], .hero-image img'), 15, '');
    }

    scheduleHide();

    // Public API for app.js
    window.LifeStyleLoader = {
        optimizeImageUrl,
        thumbUrl,
        initLazyMedia,
        preloadImage,
        showPageLoader,
        hidePageLoader,
        loadLazyElement,
        hidePreloader,
        bumpProgress
    };
})();
