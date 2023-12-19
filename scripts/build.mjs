import esbuild from 'esbuild';

import { baseConfig } from './base-config.mjs';

await esbuild.build({
  ...baseConfig,
  minify: true,
  minifyWhitespace: true,
});
