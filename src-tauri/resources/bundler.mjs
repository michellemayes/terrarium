#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CACHE_DIR = process.env.TERRARIUM_CACHE_DIR || path.join(os.homedir(), '.terrarium');
const NODE_MODULES = path.join(CACHE_DIR, 'node_modules');

export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const pkgPath = path.join(CACHE_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'terrarium-cache', private: true }, null, 2));
  }
}

export function installPackages(packages) {
  if (packages.length === 0) return;
  const pkgList = packages.join(' ');
  console.error(`[terrarium] Installing: ${pkgList}`);
  execSync(`npm install --prefix "${CACHE_DIR}" ${pkgList}`, {
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 120000
  });
}

export function isInstalled(pkg) {
  try {
    const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
    return fs.existsSync(path.join(NODE_MODULES, pkgName));
  } catch {
    return false;
  }
}

export async function bundle(inputFile) {
  ensureCacheDir();

  const resolvedInput = path.resolve(inputFile);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`File not found: ${resolvedInput}`);
  }

  const basePackages = ['react', 'react-dom', 'esbuild'];
  const missingBase = basePackages.filter(p => !isInstalled(p));
  if (missingBase.length > 0) {
    installPackages(missingBase);
  }

  const esbuildPath = path.join(NODE_MODULES, 'esbuild', 'lib', 'main.js');
  const esbuild = await import(esbuildPath);

  const missing = new Set();

  const detectPlugin = {
    name: 'detect-missing',
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        const pkg = args.path.startsWith('@')
          ? args.path.split('/').slice(0, 2).join('/')
          : args.path.split('/')[0];

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

  if (missing.size > 0) {
    installPackages(Array.from(missing));
  }

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

  return result.outputFiles[0].text;
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
    const errorPayload = JSON.stringify({
      error: true,
      message: err.message,
      errors: err.errors || []
    });
    process.stdout.write(errorPayload);
    process.exit(1);
  });
