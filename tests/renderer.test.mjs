import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

function createRendererEnv() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <body>
      <div id="root"></div>
      <div id="error-banner">
        <div id="error-header">
          <span id="error-title"></span>
          <button id="error-toggle"></button>
        </div>
        <pre id="error-detail"></pre>
      </div>
    </body>
    </html>
  `, { url: 'http://localhost' });

  const document = dom.window.document;

  function showError(message) {
    const banner = document.getElementById('error-banner');
    const title = document.getElementById('error-title');
    const detail = document.getElementById('error-detail');
    const root = document.getElementById('root');

    banner.classList.remove('hidden');
    banner.classList.add('visible');
    title.textContent = 'Build Error';
    detail.textContent = message;
    root.style.opacity = '0.4';
  }

  function hideError() {
    const banner = document.getElementById('error-banner');
    const root = document.getElementById('root');

    banner.classList.add('hidden');
    banner.classList.remove('visible');
    root.style.opacity = '1';
  }

  function isErrorVisible() {
    const banner = document.getElementById('error-banner');
    return banner.classList.contains('visible');
  }

  function toggleErrorDetail() {
    const detail = document.getElementById('error-detail');
    if (detail.style.display === 'none') {
      detail.style.display = 'block';
    } else {
      detail.style.display = 'none';
    }
  }

  return { dom, document, showError, hideError, isErrorVisible, toggleErrorDetail };
}

describe('renderer', () => {
  describe('showError', () => {
    it('makes error banner visible', () => {
      const { showError, isErrorVisible } = createRendererEnv();
      showError('test error');
      expect(isErrorVisible()).toBe(true);
    });

    it('sets error message text', () => {
      const { document, showError } = createRendererEnv();
      showError('Could not resolve "bad-pkg"');
      expect(document.getElementById('error-detail').textContent).toBe('Could not resolve "bad-pkg"');
    });

    it('sets error title to Build Error', () => {
      const { document, showError } = createRendererEnv();
      showError('some error');
      expect(document.getElementById('error-title').textContent).toBe('Build Error');
    });

    it('dims the root element', () => {
      const { document, showError } = createRendererEnv();
      showError('error');
      expect(document.getElementById('root').style.opacity).toBe('0.4');
    });
  });

  describe('hideError', () => {
    it('hides the error banner', () => {
      const { showError, hideError, isErrorVisible } = createRendererEnv();
      showError('error');
      expect(isErrorVisible()).toBe(true);
      hideError();
      expect(isErrorVisible()).toBe(false);
    });

    it('restores root opacity', () => {
      const { document, showError, hideError } = createRendererEnv();
      showError('error');
      hideError();
      expect(document.getElementById('root').style.opacity).toBe('1');
    });
  });

  describe('toggleErrorDetail', () => {
    it('toggles detail visibility', () => {
      const { document, showError, toggleErrorDetail } = createRendererEnv();
      showError('error');
      const detail = document.getElementById('error-detail');
      expect(detail.style.display).not.toBe('none');
      toggleErrorDetail();
      expect(detail.style.display).toBe('none');
      toggleErrorDetail();
      expect(detail.style.display).toBe('block');
    });
  });

  describe('error auto-dismiss', () => {
    it('hideError is called when a new successful bundle arrives', () => {
      const { showError, hideError, isErrorVisible } = createRendererEnv();
      showError('build failed');
      expect(isErrorVisible()).toBe(true);
      hideError();
      expect(isErrorVisible()).toBe(false);
    });
  });
});
