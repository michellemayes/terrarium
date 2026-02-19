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
    hideError();
    root.innerHTML = '';
    // Execute the IIFE bundle directly — blob URL module scripts
    // don't work in Tauri's WebKit webview due to null origin
    new Function(bundledCode)();
  } catch (err) {
    showError(`Render error:\n${err.message}\n\n${err.stack || ''}`);
  }
}

listen('bundle-ready', (event) => {
  renderBundle(event.payload);
});

listen('bundle-error', (event) => {
  showError(event.payload);
});

invoke('request_bundle').catch(err => {
  showError(`Failed to load:\n${err}`);
});
