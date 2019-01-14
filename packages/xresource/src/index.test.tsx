import { createResource } from './'

import basicResource from './fixtures/basic-resource'

describe('context', () => {
  test('basic context', async () => {
    const instance = basicResource.read()

    expect(instance.getContext()).toEqual({ foo: 'foo' })
    instance.setContext({ foo: 'bar' })
    expect(instance.getContext()).toEqual({ foo: 'bar' })
  })

  test('using multiple instance', async () => {
    const instanceX = basicResource.read()
    const instanceY = basicResource.read()

    instanceX.setContext({ foo: 'bar' })
    instanceY.setContext({ foo: 'baz' })

    expect(instanceX.getContext()).toEqual({ foo: 'bar' })
    expect(instanceY.getContext()).toEqual({ foo: 'baz' })
  })

  test('update context using function', async () => {
    const instance = basicResource.read()

    instance.setContext(prev => ({ foo: prev.foo + 'bar' }))
    expect(instance.getContext()).toEqual({ foo: 'foobar' })
  })

  test('update context using mutation', async () => {
    const instance = basicResource.read()

    instance.send('SET_FOO', 'bar')
    instance.send('SET_FOO', 'baz')
    instance.send('SET_FOO', 'foo')

    expect(instance.getContext()).toEqual({ foo: 'foo' })
  })

  test('update context inside effect', async () => {
    const instance = basicResource.read()
    instance.effects.changeFoo('bar')
    instance.effects.changeFoo('foo')

    expect(instance.getContext()).toEqual({ foo: 'foo' })
  })
})

describe('data', () => {
  test('retrieve first data', async () => {
    const instance = basicResource.read()

    instance.setContext({ foo: 'bar' })
    expect(instance.getData()).toEqual({})

    await instance.update()
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })
  })

  test('update data on context change', async () => {
    const instance = basicResource.read()

    await instance.update()
    expect(instance.getData()).toEqual({
      bar: 'foobar',
    })

    instance.setContext({ foo: 'bar' })
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })
  })

  test('get errors from data', async () => {
    const resource = createResource({
      data: {
        bar: () => {
          throw new Error('Some throw')
        },
      },
    })

    const instance = resource.read()
    await instance.update()
    expect(instance.getError().bar).toBeInstanceOf(Error)
    expect(instance.getData().bar).toBeNull()
  })

  test('reset all to initial', async () => {
    const instance = basicResource.read()

    instance.setContext({ foo: 'bar' })
    await instance.update()
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
    const instance = basicResource.read()
    const contextFn = jest.fn(() => null)
    const startFn = jest.fn(() => null)
    const doneFn = jest.fn(() => null)

    instance.onContextChange(contextFn)
    instance.onUpdateStart(startFn)
    instance.onUpdateDone(doneFn)
    instance.setContext({ foo: 'bar' })
    instance.setContext({ foo: 'foo' })

    await instance.update()

    expect(contextFn).toBeCalled()
    expect(contextFn).toBeCalledTimes(2)
    expect(contextFn).toBeCalledWith({ foo: 'foo' })
    expect(startFn).toBeCalled()
    expect(startFn).toBeCalledWith({ foo: 'foo' }, {})
    expect(doneFn).toBeCalled()
    expect(doneFn).toBeCalledWith({ foo: 'foo' }, { bar: 'foobar' }, {})
  })
})
