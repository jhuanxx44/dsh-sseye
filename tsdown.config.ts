import { isBuiltin } from 'node:module'
import { defineConfig } from 'tsdown'

/**
 * Self-contained port of the DeepSeek Harness client-bundle contract (the
 * upstream preset in packages/client/tsdown.client.ts is monorepo-coupled and
 * cannot be reused from a third-party repository):
 *
 * - the client artifact is a single CJS file wrapped in
 *   `window.__ModuleLoader__.load({ id, factory })`;
 * - platform modules (react, cordis, the slot registry, …) stay external and
 *   resolve through the loader's injected `require`;
 * - everything else must inline — a require() the module table cannot answer
 *   is a guaranteed runtime throw.
 *
 * The list is exactly what this bundle actually requires. `@deepseek-ai/dsh-client-runtime`
 * sat here as a leftover until 0.4.4 even though it is not imported — and it
 * does not exist at all in DSH 0.2.0-rc.2, so a future import of it would have
 * compiled into a require() the module table cannot answer.
 */
const CLIENT_EXTERNALS = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
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
