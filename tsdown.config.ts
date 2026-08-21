import { isBuiltin } from 'node:module'
import { defineConfig } from 'tsdown'

/**
 * Self-contained port of the DeepSeek Harness client-bundle contract (the
 * upstream preset in packages/client/tsdown.client.ts is monorepo-coupled and
 * cannot be reused from a third-party repository):
 *
 * - the client artifact is a single CJS file wrapped in
 *   `window.__ModuleLoader__.load({ id, factory })`;
 * - platform modules (react, cordis, the client-runtime row, …) stay external
 *   and resolve through the loader's injected `require`;
 * - everything else must inline — a require() the module table cannot answer
 *   is a guaranteed runtime throw.
 */
const CLIENT_EXTERNALS = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
])

export default defineConfig([
  {
    name: 'dsh-sseye',
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: (specifier: string) => isBuiltin(specifier),
      alwaysBundle: (specifier: string) => !isBuiltin(specifier),
    },
  },
  {
    name: 'dsh-sseye/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    clean: false,
    sourcemap: true,
    deps: {
      neverBundle: (specifier: string) => CLIENT_EXTERNALS.has(specifier),
      alwaysBundle: (specifier: string) => !CLIENT_EXTERNALS.has(specifier),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: "dsh-sseye", factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
