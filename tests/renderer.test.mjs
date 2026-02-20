import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

const RENDERER_SRC = fs.readFileSync(path.resolve('src/renderer.js'), 'utf-8');
const INDEX_HTML = fs.readFileSync(path.resolve('src/index.html'), 'utf-8');

function createRendererEnv(invokeImpl) {
  const dom = new JSDOM(INDEX_HTML, {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable',
  });

  const listeners = {};
  const showWindow = vi.fn(() => Promise.resolve());

  dom.window.__TAURI__ = {
    event: {
      listen: vi.fn((event, handler) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
        return Promise.resolve(() => {});
      }),
    },
    core: {
      invoke: vi.fn((command, payload) => {
        if (invokeImpl) {
          return invokeImpl(command, payload);
        }
        return Promise.reject('No file loaded');
      }),
    },
    webviewWindow: {
      getCurrentWindow: vi.fn(() => ({
        show: showWindow,
      })),
    },
  };

  dom.window.eval(RENDERER_SRC);

  function emit(event, payload) {
    const handlers = listeners[event] || [];
    handlers.forEach(h => h({ payload }));
  }

  return {
    dom,
    document: dom.window.document,
    listeners,
    emit,
    window: dom.window,
    showWindow,
  };
}

describe('renderer', () => {
  describe('first-run hint', () => {
    it('has a first-run-hint element with expected structure', () => {
      const dom = new JSDOM(INDEX_HTML);
      const hint = dom.window.document.getElementById('first-run-hint');
      expect(hint).toBeTruthy();
      expect(hint.querySelector('#first-run-dismiss')).toBeTruthy();
    });

    it('shows first-run hint after first successful bundle when backend reports first run', async () => {
      const { document, emit } = createRendererEnv((command) => {
        if (command === 'check_node') return Promise.resolve({ supported: true, version: 'v20.0.0' });
        if (command === 'request_bundle') return Promise.reject('No file loaded');
        if (command === 'is_first_run') return Promise.resolve(true);
        return Promise.reject('No file loaded');
      });
      emit('bundle-ready', 'void 0;');
      await Promise.resolve();
      await Promise.resolve();
      expect(document.getElementById('first-run-hint').classList.contains('visible')).toBe(true);
    });

    it('dismisses first-run hint and marks first run complete', async () => {
      const { document, emit, window } = createRendererEnv((command) => {
        if (command === 'check_node') return Promise.resolve({ supported: true, version: 'v20.0.0' });
        if (command === 'request_bundle') return Promise.reject('No file loaded');
        if (command === 'is_first_run') return Promise.resolve(true);
        if (command === 'mark_first_run_complete') return Promise.resolve();
        return Promise.reject('No file loaded');
      });
      emit('bundle-ready', 'void 0;');
      await Promise.resolve();
      await Promise.resolve();
      const dismiss = document.getElementById('first-run-dismiss');
      dismiss.click();
      expect(document.getElementById('first-run-hint').classList.contains('visible')).toBe(false);
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith('mark_first_run_complete');
    });
  });

  describe('node banner', () => {
    it('has a node-banner element with expected structure', () => {
      const dom = new JSDOM(INDEX_HTML);
      const banner = dom.window.document.getElementById('node-banner');
      expect(banner).toBeTruthy();
      expect(banner.querySelector('#node-banner-text')).toBeTruthy();
      expect(banner.querySelector('#node-banner-link')).toBeTruthy();
      expect(banner.querySelector('#node-banner-close')).toBeTruthy();
    });

    it('node-banner is hidden by default', () => {
      const dom = new JSDOM(INDEX_HTML);
      const banner = dom.window.document.getElementById('node-banner');
      expect(banner.classList.contains('visible')).toBe(false);
    });
  });

  describe('showError / hideError', () => {
    it('shows error banner with message', () => {
      const { document, emit, showWindow } = createRendererEnv();
      emit('bundle-error', 'Something went wrong');
      const banner = document.getElementById('error-banner');
      const detail = document.getElementById('error-detail');
      expect(banner.classList.contains('visible')).toBe(true);
      expect(detail.textContent).toBe('Something went wrong');
      expect(showWindow).toHaveBeenCalledTimes(1);
    });

    it('dims root when error is shown', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-error', 'error');
      expect(document.getElementById('root').style.opacity).toBe('0.4');
    });

    it('hides error and restores opacity on successful bundle', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-error', 'error');
      expect(document.getElementById('error-banner').classList.contains('visible')).toBe(true);
      emit('bundle-ready', 'void 0;');
      expect(document.getElementById('error-banner').classList.contains('visible')).toBe(false);
      expect(document.getElementById('root').style.opacity).toBe('1');
    });

    it('shows syntax error title and location detail from bundler JSON', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-error', JSON.stringify({
        error: true,
        type: 'syntax',
        message: 'Build failed',
        errors: [
          {
            text: 'Expected ")" but found "}"',
            location: { file: '/tmp/App.tsx', line: 12, column: 8 }
          }
        ]
      }));
      expect(document.getElementById('error-title').textContent).toBe('Syntax Error');
      expect(document.getElementById('error-detail').textContent).toContain('/tmp/App.tsx:12:8');
      expect(document.getElementById('error-detail').textContent).toContain('Expected ")" but found "}"');
    });

    it('shows missing package guidance for resolve errors', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-error', JSON.stringify({
        error: true,
        type: 'resolve',
        message: 'Could not resolve "lucide-react"',
        errors: [{ text: 'Could not resolve "lucide-react"' }]
      }));
      expect(document.getElementById('error-title').textContent).toBe('Missing Package');
      expect(document.getElementById('error-detail').textContent)
        .toContain("Can't find package 'lucide-react'.");
    });

    it('shows friendly network copy for network errors', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-error', JSON.stringify({
        error: true,
        type: 'network',
        message: 'Network error',
        errors: []
      }));
      expect(document.getElementById('error-title').textContent).toBe('Network Error');
      expect(document.getElementById('error-detail').textContent)
        .toContain('Failed to install dependencies. Check your internet connection and try again.');
    });
  });

  describe('toggleError', () => {
    it('toggles error detail visibility', () => {
      const { document, emit, window } = createRendererEnv();
      emit('bundle-error', 'error');
      const detail = document.getElementById('error-detail');
      expect(detail.style.display).toBe('block');
      window.toggleError();
      expect(detail.style.display).toBe('none');
      window.toggleError();
      expect(detail.style.display).toBe('block');
    });
  });

  describe('bundle rendering', () => {
    it('executes bundled code on bundle-ready', () => {
      const { document, emit, showWindow } = createRendererEnv();
      emit('bundle-ready', 'document.getElementById("root").innerHTML = "<p>hello</p>";');
      expect(document.getElementById('root').innerHTML).toBe('<p>hello</p>');
      expect(showWindow).toHaveBeenCalledTimes(1);
    });

    it('shows render error if bundled code throws', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-ready', 'throw new Error("boom");');
      const banner = document.getElementById('error-banner');
      expect(banner.classList.contains('visible')).toBe(true);
      expect(document.getElementById('error-detail').textContent).toContain('boom');
    });

    it('shows window when no-file is emitted', () => {
      const { emit, showWindow } = createRendererEnv();
      emit('no-file');
      expect(showWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('event listeners', () => {
    it('registers all expected Tauri event listeners', () => {
      const { listeners } = createRendererEnv();
      const expected = ['bundle-ready', 'bundle-error', 'no-file', 'menu-open-file',
        'tauri://drag-drop', 'tauri://drag-enter', 'tauri://drag-leave',
        'install-started', 'install-finished'];
      for (const event of expected) {
        expect(listeners[event], `missing listener for ${event}`).toBeDefined();
      }
    });
  });

  describe('install banner', () => {
    it('shows install banner on install-started', () => {
      const { document, emit } = createRendererEnv();
      emit('install-started');
      expect(document.getElementById('install-banner').classList.contains('visible')).toBe(true);
    });

    it('hides install banner on install-finished', () => {
      const { document, emit } = createRendererEnv();
      emit('install-started');
      emit('install-finished');
      expect(document.getElementById('install-banner').classList.contains('visible')).toBe(false);
    });
  });

  describe('drag and drop', () => {
    it('shows drop overlay on drag-enter', () => {
      const { document, emit } = createRendererEnv();
      emit('tauri://drag-enter');
      expect(document.getElementById('drop-overlay').classList.contains('visible')).toBe(true);
    });

    it('hides drop overlay on drag-leave', () => {
      const { document, emit } = createRendererEnv();
      emit('tauri://drag-enter');
      emit('tauri://drag-leave');
      expect(document.getElementById('drop-overlay').classList.contains('visible')).toBe(false);
    });

    it('opens all dropped tsx files in new windows when file already loaded', () => {
      const { emit, window } = createRendererEnv();
      emit('bundle-ready', 'void 0;');
      emit('tauri://drag-drop', { paths: ['/a.tsx', '/b.tsx', '/c.tsx'] });
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith(
        'open_in_new_windows',
        { paths: ['/a.tsx', '/b.tsx', '/c.tsx'] }
      );
    });

    it('opens first dropped file locally and rest in new windows on welcome screen', () => {
      const { emit, window } = createRendererEnv();
      emit('tauri://drag-drop', { paths: ['/a.tsx', '/b.tsx', '/c.tsx'] });
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith('open_file', { path: '/a.tsx' });
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith(
        'open_in_new_windows',
        { paths: ['/b.tsx', '/c.tsx'] }
      );
    });

    it('filters non-tsx files from drop and only opens tsx files', () => {
      const { emit, window } = createRendererEnv();
      emit('tauri://drag-drop', { paths: ['/a.tsx', '/b.js', '/c.tsx'] });
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith('open_file', { path: '/a.tsx' });
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith(
        'open_in_new_windows',
        { paths: ['/c.tsx'] }
      );
    });
  });

  describe('request_bundle on load', () => {
    it('renders and shows window when request_bundle succeeds', async () => {
      const dom = new JSDOM(INDEX_HTML, {
        url: 'http://localhost',
        runScripts: 'dangerously',
        resources: 'usable',
      });
      const listeners = {};
      const showWindow = vi.fn(() => Promise.resolve());
      const bundledCode = 'document.getElementById("root").innerHTML = "<p>loaded</p>";';

      dom.window.__TAURI__ = {
        event: {
          listen: vi.fn((event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
            return Promise.resolve(() => {});
          }),
        },
        core: {
          invoke: vi.fn((cmd) => {
            if (cmd === 'request_bundle') return Promise.resolve(bundledCode);
            return Promise.reject('No file loaded');
          }),
        },
        webviewWindow: {
          getCurrentWindow: vi.fn(() => ({ show: showWindow })),
        },
      };

      dom.window.eval(RENDERER_SRC);
      // Let the microtask (invoke promise) resolve
      await new Promise(r => setTimeout(r, 10));

      expect(dom.window.document.getElementById('root').innerHTML).toBe('<p>loaded</p>');
      expect(showWindow).toHaveBeenCalled();
    });
  });

  describe('open button', () => {
    it('calls pick_and_open_files on button click', () => {
      const { document, window } = createRendererEnv();
      const btn = document.getElementById('open-btn');
      expect(btn).toBeTruthy();
      btn.click();
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith('pick_and_open_files');
    });
  });
});
