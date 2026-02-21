#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CACHE_DIR = process.env.TERRARIUM_CACHE_DIR || path.join(os.homedir(), '.terrarium');
const NODE_MODULES = path.join(CACHE_DIR, 'node_modules');
const NETWORK_MARKERS = ['ENOTFOUND', 'ENETUNREACH', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED'];

export function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const pkgPath = path.join(CACHE_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'terrarium-cache', private: true }, null, 2));
  }
}

export function installPackages(packages) {
  if (packages.length === 0) return;
  console.error(`[terrarium] Installing: ${packages.join(' ')}`);
  try {
    execFileSync('npm', ['install', '--prefix', CACHE_DIR, ...packages], {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: 120000
    });
  } catch (err) {
    const msg = String(err.stderr || err.stdout || err.message || '');
    if (isNetworkMessage(msg)) {
      const networkErr = new Error(`Network error: could not install ${packages.join(', ')}. Check your internet connection.`);
      networkErr.type = 'network';
      throw networkErr;
    }
    throw err;
  }
}

function isNetworkMessage(message) {
  return NETWORK_MARKERS.some(marker => message.includes(marker));
}

function packageName(specifier) {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/').replace(/@[^@/]+$/, '');
  }
  return specifier.split('/')[0].replace(/@.*$/, '');
}

export function isInstalled(pkg) {
  return fs.existsSync(path.join(NODE_MODULES, packageName(pkg)));
}

async function generateTailwindCss(contentToScan) {
  const customRequire = createRequire(path.join(CACHE_DIR, 'package.json'));
  const postcss = customRequire('postcss');
  const tailwindcss = customRequire('tailwindcss');

  const cssInput = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';

  const result = await postcss([
    tailwindcss({
      content: [{ raw: contentToScan, extension: 'html' }],
      corePlugins: { preflight: true },
    })
  ]).process(cssInput, { from: undefined });

  return result.css;
}

export async function bundle(inputFile) {
  ensureCacheDir();

  const resolvedInput = path.resolve(inputFile);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`File not found: ${resolvedInput}`);
  }

  const basePackages = ['react', 'react-dom', 'esbuild', 'postcss', 'tailwindcss@3'];
  installPackages(basePackages.filter(p => !isInstalled(p)));

  const esbuildPath = path.join(NODE_MODULES, 'esbuild', 'lib', 'main.js');
  const esbuild = await import(esbuildPath);

  const missing = new Set();

  const detectPlugin = {
    name: 'detect-missing',
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        const pkg = packageName(args.path);
        if (!isInstalled(pkg)) {
          missing.add(pkg);
          return { path: args.path, external: true };
        }
        return undefined;
      });
    }
  };

  await esbuild.build({
    entryPoints: [resolvedInput],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    jsxImportSource: 'react',
    write: false,
    outfile: 'out.js',
    plugins: [detectPlugin],
    nodePaths: [NODE_MODULES],
    logLevel: 'silent'
  });

  installPackages([...missing]);

  const entryCode = `
    import * as _Module from ${JSON.stringify(resolvedInput)};
    import { createElement } from 'react';
    import { createRoot } from 'react-dom/client';

    const Component = _Module.default;
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = '';
      const root = createRoot(rootEl);
      if (typeof Component === 'function') {
        root.render(createElement(Component));
      } else if (Component) {
        root.render(Component);
      } else {
        rootEl.innerHTML = '<p style="color:#888;font-family:system-ui;padding:24px;">No default export found. The TSX file must export a default React component.</p>';
      }
    }
  `;

  const result = await esbuild.build({
    stdin: {
      contents: entryCode,
      resolveDir: path.dirname(resolvedInput),
      loader: 'tsx',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: 'react',
    write: false,
    outfile: 'out.js',
    nodePaths: [NODE_MODULES],
    minify: false,
    sourcemap: false,
  });

  const bundledJs = result.outputFiles[0].text;

  let css = '';
  try {
    css = await generateTailwindCss(bundledJs);
  } catch (err) {
    console.error('[terrarium] Tailwind CSS generation failed, continuing without styles:', err.message);
  }

  if (css) {
    const cssInjection = `(function(){var s=document.getElementById("terrarium-tw");if(s)s.remove();s=document.createElement("style");s.id="terrarium-tw";s.textContent=${JSON.stringify(css)};document.head.appendChild(s)})();\n`;
    return cssInjection + bundledJs;
  }

  return bundledJs;
}

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: bundler.mjs <file.tsx>');
  process.exit(1);
}

bundle(inputFile)
  .then(output => {
    process.stdout.write(output);
  })
  .catch(err => {
    const type = classifyErrorType(err);
    const errorPayload = JSON.stringify({
      error: true,
      type,
      message: err.message,
      errors: err.errors || []
    });
    process.stdout.write(errorPayload);
    process.exit(1);
  });

function classifyErrorType(err) {
  if (err.type) return err.type;
  const message = err.message || '';
  if (err.errors?.some(e => e.text?.includes('Expected'))) return 'syntax';
  if (message.includes('Could not resolve') || err.errors?.some(e => e.text?.includes('Could not resolve'))) {
    return 'resolve';
  }
  if (message.includes('npm ERR!') || isNetworkMessage(message)) return 'network';
  if (err.errors?.length > 0) return 'build';
  return 'unknown';
}
