import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const BUNDLER = path.resolve('src-tauri/resources/bundler.mjs');
const FIXTURES = path.resolve('tests/fixtures');
const TEST_CACHE = path.join(os.tmpdir(), 'terrarium-test-cache-' + Date.now());

function runBundler(fixtureName, env = {}) {
  const fixturePath = path.join(FIXTURES, fixtureName);
  return execFileSync('node', [BUNDLER, fixturePath], {
    encoding: 'utf-8',
    timeout: 120000,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, TERRARIUM_CACHE_DIR: TEST_CACHE, ...env },
  });
}

function runBundlerRaw(fixtureName, env = {}) {
  const fixturePath = path.join(FIXTURES, fixtureName);
  try {
    const stdout = execFileSync('node', [BUNDLER, fixturePath], {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, TERRARIUM_CACHE_DIR: TEST_CACHE, ...env },
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status };
  }
}

describe('bundler.mjs', () => {
  beforeAll(() => {
    fs.mkdirSync(TEST_CACHE, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(TEST_CACHE, { recursive: true, force: true });
  });

  describe('ensureCacheDir', () => {
    it('creates cache directory and package.json if missing', () => {
      const testDir = path.join(os.tmpdir(), 'terrarium-test-ensure-' + Date.now());
      runBundlerRaw('simple-counter.tsx', { TERRARIUM_CACHE_DIR: testDir });
      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'package.json'))).toBe(true);
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('simple TSX bundling', () => {
    it('bundles a simple React component with useState', () => {
      const output = runBundler('simple-counter.tsx');
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(100);
      expect(output).toContain('createElement');
      expect(output).toContain('createRoot');
    });

    it('produces valid JavaScript (no TSX syntax remaining)', () => {
      const output = runBundler('simple-counter.tsx');
      // Ensure JSX from the component itself has been transpiled.
      // Note: React's internals may contain HTML tag names in string literals
      // (e.g. error messages), so we check for the actual JSX attribute syntax.
      expect(output).not.toContain('<div className=');
      expect(output).not.toContain('onClick={() =>');
    });
  });

  describe('self-rendering wrapper', () => {
    it('includes createRoot mount code for default exports', () => {
      const output = runBundler('simple-counter.tsx');
      expect(output).toContain('createRoot');
      expect(output).toContain('getElementById');
      expect(output).toContain('root');
    });

    it('handles files with no default export gracefully', () => {
      const result = runBundlerRaw('no-default-export.tsx');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
    });
  });

  describe('external dependencies', () => {
    it('auto-installs missing packages and bundles them', () => {
      const output = runBundler('with-external-dep.tsx');
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(100);
      expect(output).toContain('createRoot');
    });
  });

  describe('error handling', () => {
    it('exits with non-zero code for syntax errors', () => {
      const result = runBundlerRaw('syntax-error.tsx');
      expect(result.exitCode).not.toBe(0);
    });

    it('outputs JSON error for syntax errors', () => {
      const result = runBundlerRaw('syntax-error.tsx');
      try {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.error).toBe(true);
        expect(parsed.message).toBeTruthy();
      } catch {
        expect(result.stderr).toBeTruthy();
      }
    });

    it('includes error type in JSON error output', () => {
      const result = runBundlerRaw('syntax-error.tsx');
      const parsed = JSON.parse(result.stdout);
      expect(parsed.error).toBe(true);
      expect(parsed.type).toBeTruthy();
      expect(['syntax', 'resolve', 'build', 'unknown', 'network']).toContain(parsed.type);
    });

    it('exits with non-zero when no file argument provided', () => {
      try {
        execFileSync('node', [BUNDLER], { encoding: 'utf-8' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.status).not.toBe(0);
        expect(err.stderr).toContain('Usage');
      }
    });

    it('exits with non-zero for non-existent file', () => {
      const result = runBundlerRaw('does-not-exist.tsx');
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('isInstalled', () => {
    it('returns true for react after base packages are installed', () => {
      runBundler('simple-counter.tsx');
      const nodeModules = path.join(TEST_CACHE, 'node_modules');
      expect(fs.existsSync(path.join(nodeModules, 'react'))).toBe(true);
      expect(fs.existsSync(path.join(nodeModules, 'react-dom'))).toBe(true);
    });
  });
});
