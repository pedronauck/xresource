const { omit, get } = require('lodash')
const typescript = require('@pedronauck/rollup-plugin-typescript2')
const babel = require('rollup-plugin-babel')

const sizePlugin = require('./plugins/size')
const copyPlugin = require('./plugins/copy')

const defaultPlugins = outputDir => [
  babel({
    exclude: 'node_modules/**',
    runtimeHelpers: false,
  }),
  typescript({
    rollupCommonJSResolveHack: true,
  }),
  sizePlugin(outputDir),
]

const output = (format, outputDir, { plugins = [], ...opts }) => ({
  ...opts,
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
