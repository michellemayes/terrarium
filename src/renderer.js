const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const root = document.getElementById('root');
const errorBanner = document.getElementById('error-banner');
const errorDetail = document.getElementById('error-detail');
const errorToggle = document.getElementById('error-toggle');
const dropOverlay = document.getElementById('drop-overlay');
const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');
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

const errorTitle = document.getElementById('error-title');

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

const errorHeader = document.getElementById('error-header');

function toggleError() {
  detailExpanded = !detailExpanded;
  errorDetail.style.display = detailExpanded ? 'block' : 'none';
  errorToggle.textContent = detailExpanded ? '\u25BC' : '\u25B6';
  if (errorHeader) errorHeader.setAttribute('aria-expanded', String(detailExpanded));
}

if (errorHeader) {
  errorHeader.addEventListener('click', toggleError);
}

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

listen('bundle-started', () => {
  progressBar.classList.add('visible');
  progressBar.setAttribute('aria-busy', 'true');
  progressStatus.textContent = 'Loading...';
  progressStatus.classList.add('visible');
});

listen('bundle-progress', (event) => {
  progressStatus.textContent = event.payload;
});

listen('bundle-finished', () => {
  progressBar.classList.remove('visible');
  progressBar.setAttribute('aria-busy', 'false');
  progressStatus.classList.remove('visible');
});

listen('menu-open-file', () => {
  openFilePicker();
});

listen('tauri://drag-drop', (event) => {
  dropOverlay.classList.remove('visible');
  const paths = event.payload.paths;
  if (!paths || paths.length === 0) return;

  const supported = paths.filter(p => p.endsWith('.tsx') || p.endsWith('.jsx'));
  if (supported.length === 0) {
    showError('Only .tsx and .jsx files are supported');
    return;
  }

  if (fileLoaded) {
    invoke('open_in_new_windows', { paths: supported });
  } else {
    openFileByPath(supported[0]);
    if (supported.length > 1) {
      invoke('open_in_new_windows', { paths: supported.slice(1) });
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
  shelfPlants.replaceChildren();

  recentFiles.forEach((file, index) => {
    const item = document.createElement('button');
    item.className = 'plant-item';
    item.title = file.path;
    item.style.animationDelay = (index * 0.06) + 's';

    const filename = file.path.split('/').pop() || file.path;
    const displayName = filename.replace(/\.(tsx|jsx)$/, '');
    item.setAttribute('aria-label', 'Open ' + displayName);

    const svg = getPlantSvg(file.plant);
    if (svg) {
      item.appendChild(svg);
    }

    const name = document.createElement('span');
    name.className = 'plant-name';
    name.textContent = displayName;
    name.setAttribute('aria-hidden', 'true');
    item.appendChild(name);

    item.addEventListener('click', () => {
      openFileByPath(file.path);
    });

    shelfPlants.appendChild(item);
  });
}

function loadPlantShelf() {
  invoke('get_recent_files')
    .then(files => renderPlantShelf(files))
    .catch(() => {});
}

loadPlantShelf();

// --- Update notification ---

const updateToast = document.getElementById('update-toast');
const updateMessage = document.getElementById('update-toast-message');
const updateActions = document.getElementById('update-toast-actions');

function clearChildren(el) {
  el.replaceChildren();
}

function createBtn(text, className, onClick) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function showUpdateAvailable(version) {
  if (!updateToast || !updateMessage || !updateActions) return;
  updateMessage.textContent = 'Terrarium v' + version + ' is available.';
  clearChildren(updateActions);

  updateActions.appendChild(createBtn('Update', 'update-primary-btn', () => {
    showUpdateDownloading();
    invoke('download_update').catch(err => showUpdateError(err));
  }));
  updateActions.appendChild(createBtn('\u00d7', 'update-dismiss-btn', () => {
    updateToast.classList.remove('visible');
  }));
  updateToast.classList.add('visible');
}

function showUpdateDownloading() {
  if (!updateMessage || !updateActions) return;
  clearChildren(updateMessage);
  const spinner = document.createElement('span');
  spinner.className = 'update-spinner';
  updateMessage.appendChild(spinner);
  updateMessage.appendChild(document.createTextNode('Downloading update\u2026'));
  clearChildren(updateActions);
}

function showUpdateReady() {
  if (!updateMessage || !updateActions) return;
  updateMessage.textContent = 'Update downloaded. Restart now?';
  clearChildren(updateActions);

  updateActions.appendChild(createBtn('Restart', 'update-primary-btn', () => {
    invoke('restart_app').catch(() => {});
  }));
  updateActions.appendChild(createBtn('Later', 'update-dismiss-btn', () => {
    updateToast.classList.remove('visible');
  }));
}

function showUpdateError(err) {
  if (!updateMessage || !updateActions) return;
  updateMessage.textContent = 'Update failed. Try again?';
  clearChildren(updateActions);

  updateActions.appendChild(createBtn('Try Again', 'update-primary-btn', () => {
    showUpdateDownloading();
    invoke('download_update').catch(e => showUpdateError(e));
  }));
  updateActions.appendChild(createBtn('\u00d7', 'update-dismiss-btn', () => {
    updateToast.classList.remove('visible');
  }));
}

listen('update-available', (event) => {
  showUpdateAvailable(event.payload);
});

listen('update-downloaded', () => {
  showUpdateReady();
});

listen('update-error', (event) => {
  showUpdateError(event.payload);
});

// --- Ambient particles ---

(function initParticles() {
  const canvas = document.getElementById('terrarium-canvas');
  if (!canvas) return;
  if (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ctx;
  try { ctx = canvas.getContext('2d'); } catch { return; }
  if (!ctx) return;
  const particles = [];
  const colors = [
    'rgba(167,139,250,', // accent
    'rgba(196,181,253,', // lavender
    'rgba(255,138,208,', // pink
    'rgba(221,214,254,', // pale violet
  ];
  let t = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    particles.length = 0;
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.2,
        wobble: 0.3 + Math.random() * 0.5,
        amp: 12 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.12 + Math.random() * 0.3,
      });
    }
  }

  function frame() {
    if (!canvas.isConnected) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    t += 0.006;

    for (const p of particles) {
      p.y -= p.speed;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      const dx = Math.sin(t * p.wobble + p.phase) * p.amp;
      const a = p.alpha * (0.5 + 0.5 * Math.sin(t * 1.2 + p.phase));

      ctx.beginPath();
      ctx.arc(p.x + dx, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + a + ')';
      ctx.fill();

      if (p.r > 1) {
        ctx.beginPath();
        ctx.arc(p.x + dx, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (a * 0.1) + ')';
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  resize();
  seed();
  requestAnimationFrame(frame);
  window.addEventListener('resize', () => { resize(); seed(); });
})();
