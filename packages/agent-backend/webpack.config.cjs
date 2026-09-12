/*
 * Copyright (c) 2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

const path = require('path');
const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: path.join(__dirname, 'src/index.ts'),
    output: {
      // Use .cjs extension so Node.js treats this as CommonJS regardless of
      // the root package.json "type": "module" setting. The webpack bundle
      // uses require() internally and must not be loaded as an ES module.
      filename: path.join('server', 'index.cjs'),
      path: path.join(__dirname, 'lib'),
      clean: true,
      libraryTarget: 'commonjs2',
    },
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? 'source-map' : 'eval-source-map',
    watchOptions: isProd ? undefined : {
      ignored: /node_modules/,
      poll: 1000,
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.(ts|js)$/,
          use: ['source-map-loader'],
          include: [path.resolve(__dirname, 'src')],
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.webpack.json'),
            transpileOnly: true,
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
      alias: {
        '@': path.resolve(__dirname, 'src/'),
      },
    },
    plugins: [
      new webpack.ProgressPlugin(),
      ...(isProd ? [
        new CompressionPlugin({
          test: /\.(js|css|html|json|svg)$/,
          threshold: 1024,
          minRatio: 0.8,
        }),
      ] : []),
    ],
    node: { __dirname: false },
    target: 'node',
    optimization: {
      // Workaround for webpack 5 bug with esModuleInterop + scope hoisting
      concatenateModules: false,
    },
    // @langchain/langgraph-checkpoint-postgres/dist/index.js is an ES module
    // that does `import pg from "pg"; const { Pool } = pg`. When webpack
    // processes ESM→CJS it wraps CJS externals in a namespace object, making
    // pg.Pool undefined at runtime (Pool is on pg.default, not pg).
    // The 'commonjs pg' format tells webpack to use require("pg") directly
    // without the namespace wrap, so Pool is reachable as pg.Pool.
    // pg and @electric-sql/pglite must be external:
    //   pg       — CJS/ESM interop issue when bundled (pg.Pool becomes undefined)
    //   pglite   — ships a WASM binary that webpack cannot bundle
    externals: [
      'bufferutil', 'utf-8-validate', 'pg-native',
      { pg: 'commonjs pg' },
      { '@electric-sql/pglite': 'commonjs @electric-sql/pglite' },
    ],
  };
};
