const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.webviewWindow;

const root = document.getElementById('root');
const errorBanner = document.getElementById('error-banner');
const errorDetail = document.getElementById('error-detail');
const errorToggle = document.getElementById('error-toggle');
const dropOverlay = document.getElementById('drop-overlay');
const installBanner = document.getElementById('install-banner');

let fileLoaded = false;
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
    new Function(bundledCode)();
  } catch (err) {
    showError(`Render error:\n${err.message}\n\n${err.stack || ''}`);
  }
}

function openFilePicker() {
  invoke('pick_and_open_files')
    .then(bundledCode => {
      fileLoaded = true;
      renderBundle(bundledCode);
    })
    .catch(err => {
      if (err !== 'No file selected') {
        showError(`Failed to load:\n${err}`);
      }
    });
}

function openFileByPath(filePath) {
  invoke('open_file', { path: filePath })
    .then(bundledCode => {
      fileLoaded = true;
      renderBundle(bundledCode);
    })
    .catch(err => showError(`Failed to load:\n${err}`));
}

const openBtn = document.getElementById('open-btn');
if (openBtn) {
  openBtn.addEventListener('click', openFilePicker);
}

listen('bundle-ready', (event) => {
  fileLoaded = true;
  getCurrentWindow().show();
  renderBundle(event.payload);
});

listen('bundle-error', (event) => {
  getCurrentWindow().show();
  showError(event.payload);
});

listen('no-file', () => {
  getCurrentWindow().show();
});

listen('install-started', () => {
  installBanner.classList.add('visible');
});

listen('install-finished', () => {
  installBanner.classList.remove('visible');
});

listen('menu-open-file', () => {
  openFilePicker();
});

listen('tauri://drag-drop', (event) => {
  dropOverlay.classList.remove('visible');
  const paths = event.payload.paths;
  if (!paths || paths.length === 0) return;

  const tsxFiles = paths.filter(p => p.endsWith('.tsx'));
  if (tsxFiles.length === 0) {
    showError('Only .tsx files are supported');
    return;
  }

  if (fileLoaded) {
    invoke('open_in_new_windows', { paths: tsxFiles });
  } else {
    openFileByPath(tsxFiles[0]);
    if (tsxFiles.length > 1) {
      invoke('open_in_new_windows', { paths: tsxFiles.slice(1) });
    }
  }
});

listen('tauri://drag-enter', () => {
  dropOverlay.classList.add('visible');
});

listen('tauri://drag-leave', () => {
  dropOverlay.classList.remove('visible');
});

invoke('request_bundle')
  .then(bundledCode => {
    fileLoaded = true;
    getCurrentWindow().show();
    renderBundle(bundledCode);
  })
  .catch(err => {
    if (err !== 'No file loaded') {
      showError(`Failed to load:\n${err}`);
    }
  });
