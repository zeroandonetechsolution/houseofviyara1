/*
 * Cookie Banner JavaScript for House Of Viyara
 * Handles consent management, local storage, and modal interactions
 */

// --- Helper Functions ---

// Helper function to record consent for admin panel
function recordConsent(choice) {
  let consents = JSON.parse(localStorage.getItem('sample_cookie_consents') || '[]');
  consents.push({
    id: Date.now(),
    user: localStorage.getItem('hov_user_email') || 'Anonymous',
    consent: choice,
    date: new Date().toLocaleDateString('en-IN')
  });
  localStorage.setItem('sample_cookie_consents', JSON.stringify(consents));
}

// Save consent preferences to localStorage
function saveCookieConsent(consent) {
  localStorage.setItem('hov_cookieConsent', JSON.stringify(consent));
  applyCookieConsent(consent);
  
  // Determine consent choice string
  let choice = 'Custom';
  if (consent.analytics && consent.marketing && consent.preferences) {
    choice = 'Accept All';
  } else if (!consent.analytics && !consent.marketing && !consent.preferences) {
    choice = 'Essential Only';
  }
  
  recordConsent(choice);
}

// Load consent preferences from localStorage
function loadCookieConsent() {
  const stored = localStorage.getItem('hov_cookieConsent');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing cookie consent:', e);
      return null;
    }
  }
  return null;
}

// Check if user has already given consent
function hasCookieConsent() {
  return localStorage.getItem('hov_cookieConsent') !== null;
}

// Reset consent (useful for testing or if user wants to change preferences)
function resetCookieConsent() {
  localStorage.removeItem('hov_cookieConsent');
  showCookieBanner();
}

// Apply consent (initialize scripts based on preferences)
function applyCookieConsent(consent) {
  if (consent.analytics) {
    // Initialize Google Analytics (if we had it set up)
    console.log('Analytics cookies enabled');
  } else {
    console.log('Analytics cookies disabled');
  }

  if (consent.marketing) {
    // Initialize marketing scripts
    console.log('Marketing cookies enabled');
  } else {
    console.log('Marketing cookies disabled');
  }

  if (consent.preferences) {
    console.log('Preference cookies enabled');
  } else {
    console.log('Preference cookies disabled');
  }
}

// --- UI Functions ---

// Show the cookie banner
function showCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    banner.classList.remove('hide');
    banner.classList.add('show');
  }
}

// Hide the cookie banner
function hideCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    banner.classList.remove('show');
    banner.classList.add('hide');
  }
}

// Open cookie settings modal
function openCookieSettings() {
  const modal = document.getElementById('cookie-modal-overlay');
  if (modal) {
    modal.classList.add('show');
    loadCurrentPreferences();
  }
}

// Close cookie settings modal
function closeCookieSettings() {
  const modal = document.getElementById('cookie-modal-overlay');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Load current preferences into the modal
function loadCurrentPreferences() {
  let consent = loadCookieConsent();
  if (!consent) {
    consent = {
      essential: true,
      analytics: true,
      marketing: false,
      preferences: true
    };
  }

  // Update toggles in modal
  const analyticsToggle = document.getElementById('cookie-analytics');
  const marketingToggle = document.getElementById('cookie-marketing');
  const preferencesToggle = document.getElementById('cookie-preferences');

  if (analyticsToggle) analyticsToggle.checked = consent.analytics;
  if (marketingToggle) marketingToggle.checked = consent.marketing;
  if (preferencesToggle) preferencesToggle.checked = consent.preferences;
}

// Handle Accept All
function handleAcceptAll() {
  const consent = {
    essential: true,
    analytics: true,
    marketing: true,
    preferences: true
  };
  localStorage.setItem('hov_cookieConsent', JSON.stringify(consent));
  applyCookieConsent(consent);
  recordConsent('Accept All');
  hideCookieBanner();
  closeCookieSettings();
}

// Handle Essential Only
function handleEssentialOnly() {
  const consent = {
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false
  };
  localStorage.setItem('hov_cookieConsent', JSON.stringify(consent));
  applyCookieConsent(consent);
  recordConsent('Essential Only');
  hideCookieBanner();
  closeCookieSettings();
}

// Handle Save Preferences
function handleSavePreferences() {
  const analyticsToggle = document.getElementById('cookie-analytics');
  const marketingToggle = document.getElementById('cookie-marketing');
  const preferencesToggle = document.getElementById('cookie-preferences');

  const consent = {
    essential: true,
    analytics: analyticsToggle ? analyticsToggle.checked : false,
    marketing: marketingToggle ? marketingToggle.checked : false,
    preferences: preferencesToggle ? preferencesToggle.checked : false
  };

  saveCookieConsent(consent);
  hideCookieBanner();
  closeCookieSettings();
}

// Handle Reject Optional
function handleRejectOptional() {
  const consent = {
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false
  };
  saveCookieConsent(consent);
  hideCookieBanner();
  closeCookieSettings();
}

// Initialize Cookie Banner
document.addEventListener('DOMContentLoaded', function() {
  // Check if we already have consent
  if (!hasCookieConsent()) {
    // Wait a little to not show banner immediately on load
    setTimeout(showCookieBanner, 1000);
  } else {
    // If we have consent, apply it
    const consent = loadCookieConsent();
    applyCookieConsent(consent);
  }

  // Bind buttons
  const acceptAllBtn = document.getElementById('cookie-accept-all');
  const essentialBtn = document.getElementById('cookie-essential-only');
  const settingsBtn = document.getElementById('cookie-settings-link');
  const closeModalBtn = document.getElementById('cookie-close-modal');
  const savePrefsBtn = document.getElementById('cookie-save-prefs');
  const acceptAllModalBtn = document.getElementById('cookie-accept-all-modal');
  const rejectOptionalBtn = document.getElementById('cookie-reject-optional');

  if (acceptAllBtn) acceptAllBtn.addEventListener('click', handleAcceptAll);
  if (essentialBtn) essentialBtn.addEventListener('click', handleEssentialOnly);
  if (settingsBtn) settingsBtn.addEventListener('click', openCookieSettings);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeCookieSettings);
  if (savePrefsBtn) savePrefsBtn.addEventListener('click', handleSavePreferences);
  if (acceptAllModalBtn) acceptAllModalBtn.addEventListener('click', handleAcceptAll);
  if (rejectOptionalBtn) rejectOptionalBtn.addEventListener('click', handleRejectOptional);

  // Close modal when clicking overlay
  const overlay = document.getElementById('cookie-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeCookieSettings();
      }
    });
  }
});

// Expose reset function for testing (can call resetCookieConsent() in console)
window.resetCookieConsent = resetCookieConsent;
