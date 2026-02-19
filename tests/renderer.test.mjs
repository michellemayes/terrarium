import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

const RENDERER_SRC = fs.readFileSync(path.resolve('src/renderer.js'), 'utf-8');
const INDEX_HTML = fs.readFileSync(path.resolve('src/index.html'), 'utf-8');

function createRendererEnv() {
  const dom = new JSDOM(INDEX_HTML, {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable',
  });

  const listeners = {};

  // Mock Tauri APIs
  dom.window.__TAURI__ = {
    event: {
      listen: vi.fn((event, handler) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
        return Promise.resolve(() => {});
      }),
    },
    core: {
      invoke: vi.fn(() => Promise.reject('No file loaded')),
    },
  };

  // Execute renderer.js in the JSDOM context
  dom.window.eval(RENDERER_SRC);

  function emit(event, payload) {
    const handlers = listeners[event] || [];
    handlers.forEach(h => h({ payload }));
  }

  return { dom, document: dom.window.document, listeners, emit, window: dom.window };
}

describe('renderer', () => {
  describe('showError / hideError', () => {
    it('shows error banner with message', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-error', 'Something went wrong');
      const banner = document.getElementById('error-banner');
      const detail = document.getElementById('error-detail');
      expect(banner.classList.contains('visible')).toBe(true);
      expect(detail.textContent).toBe('Something went wrong');
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
      // A successful bundle clears the error
      emit('bundle-ready', 'void 0;');
      expect(document.getElementById('error-banner').classList.contains('visible')).toBe(false);
      expect(document.getElementById('root').style.opacity).toBe('1');
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
      const { document, emit } = createRendererEnv();
      emit('bundle-ready', 'document.getElementById("root").innerHTML = "<p>hello</p>";');
      expect(document.getElementById('root').innerHTML).toBe('<p>hello</p>');
    });

    it('shows render error if bundled code throws', () => {
      const { document, emit } = createRendererEnv();
      emit('bundle-ready', 'throw new Error("boom");');
      const banner = document.getElementById('error-banner');
      expect(banner.classList.contains('visible')).toBe(true);
      expect(document.getElementById('error-detail').textContent).toContain('boom');
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
  });

  describe('open button', () => {
    it('calls pick_and_open_file on button click', () => {
      const { document, window } = createRendererEnv();
      const btn = document.getElementById('open-btn');
      expect(btn).toBeTruthy();
      btn.click();
      expect(window.__TAURI__.core.invoke).toHaveBeenCalledWith('pick_and_open_file');
    });
  });
});
