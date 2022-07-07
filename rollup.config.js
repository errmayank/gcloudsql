import typescript from '@rollup/plugin-typescript'
import cleanup from 'rollup-plugin-cleanup'
import { terser } from 'rollup-plugin-terser'

import pkg from './package.json'

const env = '#!/usr/bin/env node'
const banner = `
/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author}
 * Released under ${pkg.license} License
 */
`

const plugins = [
  typescript({ tsconfig: './tsconfig.json' }),
  cleanup({ comments: false, lineEndings: 'unix' }),
]

/**
 * @type {import('rollup').RollupOptions[]}
 */
const config = [
  {
    input: 'src/mod.ts',
    plugins: [
      ...plugins,
      terser({
        format: { comments: false, preamble: `${env}\n${banner}` },
        mangle: { keep_classnames: true, keep_fnames: true },
        compress: true,
      }),
    ],
    external: ['child_process', 'util', 'chalk', 'got', 'inquirer', 'nanospinner', 'lodash-es'],
    output: {
      name: 'structs',
      file: 'lib/mod.js',
      format: 'esm',
    },
  },
]

export default config
