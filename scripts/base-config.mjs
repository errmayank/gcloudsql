import pkg from '../package.json' with { type: 'json' };

const env = '#!/usr/bin/env node';
const pkgBanner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}
 * Released under ${pkg.license} License
 */`;
const requirePolyfill =
  "import { createRequire } from 'module';const require = createRequire(import.meta.url);";

/** @type { import("esbuild").BuildOptions } */
export const baseConfig = {
  entryPoints: ['./src/bin/main.ts'],
  bundle: true,
  minify: false,
  minifyIdentifiers: false,
  minifySyntax: false,
  minifyWhitespace: false,
  sourcemap: false,
  keepNames: true,
  treeShaking: true,
  format: 'esm',
  banner: { js: [env, pkgBanner, requirePolyfill].join('\n\n') },
  platform: 'node',
  target: ['node18'],
  packages: 'external',
  outdir: './dist/bin',
};
