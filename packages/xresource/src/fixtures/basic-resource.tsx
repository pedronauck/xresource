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
    changeDoubleFoo: (_, foo) => {
      _.setContext({ foo: foo + _.getContext().foo })
    },
  },
  on: {
    SET_FOO: 'changeFoo',
    SET_DOUBLE_FOO: ['changeFoo', 'changeDoubleFoo'],
    SET_PURE_FOO: (_, foo) => {
      _.setContext({ foo })
    },
  },
})
