import { createResource } from './'
import BasicResource from './fixtures/basic-resource'

const setupBasicInstance = () => {
  const instance = BasicResource.create()
  return instance
}

describe('context', () => {
  test('with initial arguments', async () => {
    const resource = createResource(foo => ({
      context: {
        foo,
      },
      data: {
        bar: () => 'bar',
      },
    }))

    const instance = resource.with('foo').create()
    expect(instance.getContext()).toEqual({ foo: 'foo' })
    instance.setContext({ foo: 'bar' })
    expect(instance.getContext()).toEqual({ foo: 'bar' })
  })

  test('basic context', async () => {
    const { context$, data$, error$, ...instance } = setupBasicInstance()
    const contextNext = jest.spyOn(context$, 'next')
    const dataNext = jest.spyOn(data$, 'next')
    const errorNext = jest.spyOn(error$, 'next')

    expect(instance.getContext()).toEqual({ foo: 'foo' })
    instance.setContext({ foo: 'bar' })

    expect(contextNext).toBeCalledTimes(1)
    expect(dataNext).toBeCalledTimes(1)
    expect(errorNext).not.toBeCalled()
    expect(instance.getContext()).toEqual({ foo: 'bar' })
    expect(instance.getData()).toEqual({ bar: undefined })
  })

  test('using multiple instance', async () => {
    const instanceX = setupBasicInstance()
    const instanceY = setupBasicInstance()

    instanceX.setContext({ foo: 'bar' })
    instanceY.setContext({ foo: 'baz' })

    expect(instanceX.getContext()).toEqual({ foo: 'bar' })
    expect(instanceY.getContext()).toEqual({ foo: 'baz' })
  })

  test('update just when change', async () => {
    const { context$, ...instance } = setupBasicInstance()
    const spy = jest.spyOn(context$, 'next')

    instance.setContext({ foo: 'foo' })
    expect(spy).not.toBeCalled()
  })

  test('update using function', async () => {
    const instance = setupBasicInstance()
    const update = jest.fn(prev => ({ foo: prev.foo + 'bar' }))

    instance.setContext(update)
    expect(update).toBeCalled()
    expect(update).toBeCalledTimes(1)
    expect(instance.getContext()).toEqual({ foo: 'foobar' })
  })

  test('update inside effect', async () => {
    const instance = setupBasicInstance()

    instance.handlers.changeFoo('bar')
    instance.handlers.changeFoo('foo')

    expect(instance.getContext()).toEqual({ foo: 'foo' })
  })
})

describe('data', () => {
  test('retrieve first data', async () => {
    const instance = setupBasicInstance()

    instance.setContext({ foo: 'bar' })
    expect(instance.getData()).toEqual({})

    await instance.read()
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })
  })

  test('update on context change', async () => {
    const instance = setupBasicInstance()

    await instance.read()
    expect(instance.getData()).toEqual({
      bar: 'foobar',
    })

    instance.setContext({ foo: 'bar' })
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })
  })

  test('update just when data change', async () => {
    const { data$, ...instance } = setupBasicInstance()
    const spy = jest.spyOn(data$, 'next')

    await instance.read()
    expect(instance.getData()).toEqual({ bar: 'foobar' })
    instance.setContext({ foo: 'foo' })
    expect(spy).toBeCalledTimes(1)
  })

  test('update data using setData', async () => {
    const { data$, ...instance } = setupBasicInstance()
    const spy = jest.spyOn(data$, 'next')

    await instance.read()
    instance.setData(prev => ({ bar: prev.bar + 'foo' }))
    expect(spy).toBeCalledTimes(2)
    expect(instance.getData()).toEqual({ bar: 'foobarfoo' })
  })

  test('get errors from data', async () => {
    const resource = createResource({
      data: {
        bar: () => {
          throw new Error('Some throw')
        },
      },
    })

    const instance = resource.create()
    await instance.read()
    expect(instance.getError().bar).toBeInstanceOf(Error)
    expect(instance.getData().bar).toBeNull()
  })

  test('reset all to initial', async () => {
    const instance = setupBasicInstance()

    instance.setContext({ foo: 'bar' })
    await instance.read()
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })

    await instance.reset()
    expect(instance.getContext()).toEqual({ foo: 'foo' })
    expect(instance.getData()).toEqual({
      bar: 'foobar',
    })
  })

  test('resource listeners', async () => {
    const instance = BasicResource.create()
    const startFn = jest.fn(() => null)
    const doneFn = jest.fn(() => null)

    instance.onReadStart(startFn)
    instance.onReadDone(doneFn)
    instance.setContext({ foo: 'bar' })
    instance.setContext({ foo: 'foo' })

    await instance.read()

    expect(startFn).toBeCalled()
    expect(startFn).toBeCalledTimes(1)
    expect(startFn).toBeCalledWith()
    expect(doneFn).toBeCalled()
    expect(doneFn).toBeCalledTimes(3)
    expect(doneFn).toBeCalledWith({ bar: 'foobar' }, {})
  })

  describe('handlers', () => {
    test('onNext()', async () => {
      const nextHandler = jest.fn(() => null)
      const Resource = createResource({
        data: {
          bar: {
            source: () => 'bar',
            onNext: nextHandler,
          },
        },
      })

      const instance = Resource.create()
      await instance.read()
      expect(nextHandler).toBeCalled()
      expect(nextHandler.mock.calls[0][1]).toBe(undefined)
    })

    test('onError()', async () => {
      const errorHandler = jest.fn(() => null)
      const Resource = createResource({
        data: {
          bar: {
            source: () => {
              throw new Error('Oops')
            },
            onError: errorHandler,
          },
        },
      })

      const instance = Resource.create()
      await instance.read()
      expect(errorHandler).toBeCalled()
      expect(errorHandler.mock.calls[0][1]).toBeInstanceOf(Error)
    })

    test('onSuccess()', async () => {
      const successHandler = jest.fn(() => null)
      const Resource = createResource({
        data: {
          bar: {
            source: () => 'bar',
            onSuccess: successHandler,
          },
        },
      })

      const instance = Resource.create()
      await instance.read()
      expect(successHandler).toBeCalled()
      expect(successHandler.mock.calls[0][1]).toBe('bar')
    })

    test('data property with listeners', async () => {
      const nextHandler = jest.fn(value => null)
      const errorHandler = jest.fn(err => null)
      const successHandler = jest.fn(() => null)

      const ErrorResource = createResource({
        data: {
          foo: {
            onNext: nextHandler,
            onError: errorHandler,
            onSuccess: successHandler,
            source: () => {
              throw new Error('Oops!')
            },
          },
        },
      })

      const instance = ErrorResource.create()
      await instance.read()

      expect(nextHandler).toBeCalled()
      expect(successHandler).toBeCalled()
      expect(successHandler.mock.calls[0][1]).toBe(null)
      expect(errorHandler.mock.calls[0][1]).toBeInstanceOf(Error)
      expect(errorHandler.mock.calls[0][1].message).toEqual('Oops!')
      expect(instance.getError().foo.message).toEqual('Oops!')
    })

    test('data event appointing to a handler', async () => {
      const Resource = createResource({
        context: {
          foo: 'foo',
        },
        data: {
          bar: {
            onNext: 'setFoo',
            source: ctx => ctx.foo + 'bar',
          },
        },
        handlers: {
          setFoo: _ => _.setContext({ foo: 'bar' }),
        },
      })

      const instance = Resource.create()
      await instance.read()
      expect(instance.getData().bar).toEqual('barbar')
    })
  })
})

describe('communication', () => {
  test('emit using string', () => {
    const instance = BasicResource.create()
    instance.emit('SET_FOO', 'bar')
    expect(instance.getContext()).toEqual({ foo: 'bar' })
  })

  test('emit using array', () => {
    const instance = BasicResource.create()
    instance.emit('SET_DOUBLE_FOO', 'bar')
    expect(instance.getContext()).toEqual({ foo: 'barbar' })
  })

  test('emit using an function', () => {
    const instance = BasicResource.create()
    instance.emit('SET_PURE_FOO', 'bar')
    expect(instance.getContext()).toEqual({ foo: 'bar' })
  })

  test('broadcast for all resource', () => {
    const instanceX = BasicResource.create()
    const instanceY = BasicResource.create()

    instanceX.broadcast('SET_FOO', 'bar')
    expect(instanceX.getContext()).toEqual({ foo: 'bar' })
    expect(instanceY.getContext()).toEqual({ foo: 'bar' })
  })

  test('broadcast for specific resource', () => {
    const instance = BasicResource.create()

    const Resource = createResource({
      id: 'test',
      data: {
        bar: () => 'bar',
      },
      on: {
        SET_BAR: (_, bar) => _.setData({ bar }),
      },
    })

    const testInstance = Resource.create()
    instance.broadcast('test:SET_BAR', 'foo')
    expect(testInstance.getData()).toEqual({ bar: 'foo' })
  })
})
