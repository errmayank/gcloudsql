import { spawn } from 'node:child_process';
import { cwd } from 'node:process';
import esbuild from 'esbuild';

import { baseConfig } from './base-config.mjs';

/** @type {ChildProcess} */
let process = null;

let ctx = await esbuild.context({
  ...baseConfig,
  plugins: [
    {
      name: 'watch_changes',
      setup(build) {
        build.onStart(() => {
          if (process !== null) {
            console.log('Change detected, restarting.');
            process.kill();
          }
        });
        build.onEnd(() => {
          process = spawn('node', [`${cwd()}/dist/bin/main.js`], {
            stdio: 'inherit',
          });
        });
      },
    },
  ],
});

await ctx.watch();
