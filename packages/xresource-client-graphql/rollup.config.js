import { config } from '@xresource/rollup-config'

export default config({
  input: 'src/index.ts',
  external: id =>
    !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/'),
})
