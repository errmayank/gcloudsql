import { spawn } from 'node:child_process';
import { cwd } from 'node:process';
import esbuild from 'esbuild';

import { baseConfig } from './base-config.mjs';

/** @type {ChildProcess} */
let server = null;

let ctx = await esbuild.context({
  ...baseConfig,
  plugins: [
    {
      name: 'run_server',
      setup(build) {
        build.onStart(() => {
          if (server !== null) {
            console.log('Change detected, restarting.');
            server.kill();
          }
        });
        build.onEnd(() => {
          server = spawn('node', [`${cwd()}/dist/main.js`], {
            stdio: 'inherit',
          });
        });
      },
    },
  ],
});

await ctx.watch();
