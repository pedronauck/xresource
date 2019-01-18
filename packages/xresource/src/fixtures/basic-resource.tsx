import { createResource } from '../'

interface Context {
  foo: string
}

interface Data {
  bar: string
}

export default createResource<Context, Data>({
  context: {
    foo: 'foo',
  },
  data: {
    bar: {
      source: () => Promise.resolve('bar'),
      modifiers: [(ctx, bar) => ctx.foo + bar],
    },
  },
  handlers: {
    changeFoo: (_, foo) => {
      _.setContext({ foo })
    },
  },
})
