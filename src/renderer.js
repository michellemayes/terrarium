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
const firstRunHint = document.getElementById('first-run-hint');
const firstRunDismiss = document.getElementById('first-run-dismiss');
const NODEJS_URL = 'https://nodejs.org';

let fileLoaded = false;
let detailExpanded = true;
let firstRunChecked = false;

function showNodeBanner(message) {
  if (!nodeBanner || !nodeBannerText || !nodeBannerLink) return;
  nodeBannerText.textContent = message;
  nodeBannerLink.href = NODEJS_URL;
  nodeBanner.classList.add('visible');
}

invoke('check_node')
  .then(info => {
    if (!info.supported) {
      showNodeBanner(`Node.js ${info.version} found, but Terrarium needs v18+.`);
    }
  })
  .catch(() => {
    showNodeBanner('Node.js not found. Terrarium needs Node.js 18+ to run.');
  });

if (nodeBannerClose && nodeBanner) {
  nodeBannerClose.addEventListener('click', () => {
    nodeBanner.classList.remove('visible');
  });
}

function maybeShowFirstRunHint() {
  if (firstRunChecked || !firstRunHint) return;
  firstRunChecked = true;
  invoke('is_first_run')
    .then(isFirst => {
      if (isFirst) {
        firstRunHint.classList.add('visible');
      }
    })
    .catch(() => {});
}

if (firstRunDismiss && firstRunHint) {
  firstRunDismiss.addEventListener('click', () => {
    firstRunHint.classList.remove('visible');
    invoke('mark_first_run_complete').catch(() => {});
  });
}

function showError(message) {
  const errorTitle = document.getElementById('error-title');
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
  } catch {}

  errorTitle.textContent = title;
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
    maybeShowFirstRunHint();
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
    renderBundle(bundledCode);
  })
  .catch(err => {
    if (err !== 'No file loaded') {
      showError(`Failed to load:\n${err}`);
    }
  });

// --- Plant shelf (recent files) ---

const plantShelf = document.getElementById('plant-shelf');
const shelfPlants = document.getElementById('shelf-plants');
const plantEmpty = document.getElementById('plant-empty');

function getPlantSvg(plantIndex) {
  const template = document.querySelector(`template[data-plant="${plantIndex}"]`);
  if (!template) return null;
  return template.content.cloneNode(true);
}

function renderPlantShelf(recentFiles) {
  if (!plantShelf || !shelfPlants || !plantEmpty) return;

  if (recentFiles.length === 0) {
    plantShelf.style.display = 'none';
    plantEmpty.style.display = 'flex';
    return;
  }

  plantEmpty.style.display = 'none';
  plantShelf.style.display = 'block';
  shelfPlants.innerHTML = '';

  for (const file of recentFiles) {
    const item = document.createElement('div');
    item.className = 'plant-item';
    item.title = file.path;

    const svg = getPlantSvg(file.plant);
    if (svg) {
      item.appendChild(svg);
    }

    const name = document.createElement('span');
    name.className = 'plant-name';
    const filename = file.path.split('/').pop() || file.path;
    name.textContent = filename.replace(/\.tsx$/, '');
    item.appendChild(name);

    item.addEventListener('click', () => {
      openFileByPath(file.path);
    });

    shelfPlants.appendChild(item);
  }
}

function loadPlantShelf() {
  invoke('get_recent_files')
    .then(files => renderPlantShelf(files))
    .catch(() => {});
}

loadPlantShelf();
