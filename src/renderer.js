const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const root = document.getElementById('root');
const errorBanner = document.getElementById('error-banner');
const errorDetail = document.getElementById('error-detail');
const errorToggle = document.getElementById('error-toggle');
const dropOverlay = document.getElementById('drop-overlay');
const installBanner = document.getElementById('install-banner');
const nodeBanner = document.getElementById('node-banner');
const nodeBannerText = document.getElementById('node-banner-text');
const nodeBannerLink = document.getElementById('node-banner-link');
const nodeBannerClose = document.getElementById('node-banner-close');

let fileLoaded = false;
let detailExpanded = true;

invoke('check_node')
  .then(info => {
    if (!info.supported && nodeBanner && nodeBannerText && nodeBannerLink) {
      nodeBannerText.textContent = `Node.js ${info.version} found, but Terrarium needs v18+.`;
      nodeBannerLink.href = 'https://nodejs.org';
      nodeBanner.classList.add('visible');
    }
  })
  .catch(() => {
    if (nodeBanner && nodeBannerText && nodeBannerLink) {
      nodeBannerText.textContent = 'Node.js not found. Terrarium needs Node.js 18+ to run.';
      nodeBannerLink.href = 'https://nodejs.org';
      nodeBanner.classList.add('visible');
    }
  });

if (nodeBannerClose && nodeBanner) {
  nodeBannerClose.addEventListener('click', () => {
    nodeBanner.classList.remove('visible');
  });
}

function showError(message) {
  let title = 'Build Error';
  let detail = message;

  try {
    const parsed = JSON.parse(message);
    if (parsed.error) {
      detail = parsed.message || message;
      if (parsed.type === 'syntax') {
        title = 'Syntax Error';
        const loc = parsed.errors?.[0]?.location;
        if (loc) {
          detail = `${loc.file || 'file'}:${loc.line}:${loc.column}\n\n${parsed.errors[0].text}`;
        }
      } else if (parsed.type === 'resolve') {
        title = 'Missing Package';
        const pkg = parsed.errors?.[0]?.text?.match(/Could not resolve "([^"]+)"/)?.[1] || '';
        detail = pkg
          ? `Can't find package '${pkg}'. Check the package name or your network connection.`
          : detail;
      } else if (parsed.type === 'network') {
        title = 'Network Error';
        detail = 'Failed to install dependencies. Check your internet connection and try again.';
      }
    }
  } catch {
    // Not JSON, use raw message.
  }

  document.getElementById('error-title').textContent = title;
  errorDetail.textContent = detail;
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
  renderBundle(event.payload);
});

listen('bundle-error', (event) => {
  showError(event.payload);
});

listen('no-file', () => {});

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
  .then(renderBundle)
  .catch(err => {
    if (err !== 'No file loaded') {
      showError(`Failed to load:\n${err}`);
    }
  });
