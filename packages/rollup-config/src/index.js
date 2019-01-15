const { omit, get } = require('lodash')
const typescript = require('@pedronauck/rollup-plugin-typescript2')
const babel = require('rollup-plugin-babel')
const { terser } = require('rollup-plugin-terser')

const isProd = process.env.NODE_ENV === 'production'
const sizePlugin = require('./plugins/size')
const copyPlugin = require('./plugins/copy')

const defaultExternal = id =>
  !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/')

const defaultPlugins = outputDir => [
  babel({
    exclude: 'node_modules/**',
    runtimeHelpers: false,
  }),
  typescript({
    rollupCommonJSResolveHack: true,
  }),
  isProd &&
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false,
      },
    }),
  sizePlugin(outputDir),
]

const output = (format, outputDir, { plugins = [], external, ...opts }) => ({
  ...opts,
  external: external || defaultExternal,
  output: {
    format,
    dir: outputDir,
    chunkFileNames: `[name]${format !== 'cjs' ? '.[format]' : ''}.js`,
    entryFileNames: `[name]${format !== 'cjs' ? '.[format]' : ''}.js`,
  },
  plugins: plugins.concat(defaultPlugins(outputDir).filter(Boolean)),
})

exports.copy = copyPlugin
exports.config = (initial = {}) => {
  const outputDir = get(initial, 'outputDir', 'dist')
  const opts = omit(initial, ['outputDir'])
  return [output('cjs', outputDir, opts), output('esm', outputDir, opts)]
}
