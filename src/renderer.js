const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const root = document.getElementById('root');
const errorBanner = document.getElementById('error-banner');
const errorDetail = document.getElementById('error-detail');
const errorToggle = document.getElementById('error-toggle');

let detailExpanded = true;

function showError(message) {
  errorDetail.textContent = message;
  errorBanner.classList.add('visible');
  root.style.opacity = '0.4';
  detailExpanded = true;
  errorDetail.style.display = 'block';
  errorToggle.textContent = '\u25BC';
}

function hideError() {
  errorBanner.classList.remove('visible');
  root.style.opacity = '1';
}

window.toggleError = function() {
  detailExpanded = !detailExpanded;
  errorDetail.style.display = detailExpanded ? 'block' : 'none';
  errorToggle.textContent = detailExpanded ? '\u25BC' : '\u25B6';
};

async function renderBundle(bundledCode) {
  try {
    console.log('[tsx-viewer] renderBundle called, code length:', bundledCode.length);
    hideError();
    root.innerHTML = '';
    // Execute the IIFE bundle directly — blob URL module scripts
    // don't work in Tauri's WebKit webview due to null origin
    new Function(bundledCode)();
    console.log('[tsx-viewer] Bundle executed successfully');
  } catch (err) {
    console.error('[tsx-viewer] Render error:', err);
    showError(`Render error:\n${err.message}\n\n${err.stack || ''}`);
  }
}

listen('bundle-ready', (event) => {
  console.log('[tsx-viewer] bundle-ready event received');
  renderBundle(event.payload);
});

listen('bundle-error', (event) => {
  console.log('[tsx-viewer] bundle-error event received:', event.payload);
  showError(event.payload);
});

invoke('request_bundle')
  .then(bundle => {
    console.log('[tsx-viewer] request_bundle returned bundle');
    renderBundle(bundle);
  })
  .catch(err => {
    console.log('[tsx-viewer] request_bundle error:', err);
    // Don't show error if no file is loaded yet (dialog may still be opening)
    if (err !== 'No file loaded') {
      showError(`Failed to load:\n${err}`);
    }
  });
