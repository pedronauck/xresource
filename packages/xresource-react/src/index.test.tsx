import * as React from 'react'
import { render, waitForElement, fireEvent } from 'react-testing-library'

import BasicResource from './fixtures/basic-resource'
import { useResource } from './'

it('using a basic resource', async () => {
  const Foo = () => {
    const { ctx, data, loading } = useResource(BasicResource)

    if (loading) return <div data-testid="foo">loading</div>
    return <div data-testid="foo">{`${ctx.foo}${data.bar}`}</div>
  }

  const { getByText } = render(<Foo />)
  await waitForElement(() => getByText('foofoobar'))
})

it('without update on read', async () => {
  const Foo = () => {
    const { ctx, data } = useResource(BasicResource, { loadOnMount: false })
    return <div>{ctx.foo + data.bar}</div>
  }

  const { getByText } = render(<Foo />)
  await waitForElement(() => getByText('fooundefined'))
})

test('changing context on click', async () => {
  const Foo = () => {
    const { ctx, setContext } = useResource(BasicResource)

    return (
      <React.Fragment>
        <button data-testid="button" onClick={() => setContext({ foo: 'bar' })}>
          Click
        </button>
        <span data-testid="text">{ctx.foo}</span>
      </React.Fragment>
    )
  }

  const { getByTestId, rerender } = render(<Foo />)
  expect(getByTestId('text').textContent).toBe('foo')
  fireEvent.click(getByTestId('button'))
  rerender(<Foo />)
  expect(getByTestId('text').textContent).toBe('bar')
})
