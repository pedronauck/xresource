import { useState, useEffect } from 'react'
import { Resource, ErrorMap, ResourceInstance } from 'xresource'

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type OmitProps = 'effects' | 'onUpdateStart' | 'onUpdateDone'

export interface UseResource<C, D> extends Omit<Resource<C, D>, OmitProps> {
  ctx: C
  data: D
  error: ErrorMap<D>
  loading: boolean
  [key: string]: any
}

export interface Opts {
  updateOnRead?: boolean
}

export interface State<C, D> {
  ctx: C
  data: D
  error: ErrorMap<D>
  loading: boolean
}

export function useResource<C = any, D = any>(
  instance: ResourceInstance<C, D>,
  opts: Opts = { updateOnRead: true }
): UseResource<C, D> {
  const resource = instance.read()
  const {
    effects,
    context$,
    data$,
    error$,
    onContextChange,
    onUpdateDone,
    onUpdateStart,
  } = resource

  const [state, setState] = useState<State<C, D>>({
    ctx: context$.value,
    data: data$.value,
    error: error$.value,
    loading: false,
  })

  useEffect(() => {
    const onCtxSub = onContextChange(ctx => {
      setState(s => ({ ...s, ctx }))
    })

    const onStartSub = onUpdateStart(() =>
      setState(s => ({ ...s, loading: true }))
    )

    const onDoneSub = onUpdateDone((data, error) => {
      setState(s => ({ ...s, data, error }))
    })

    opts.updateOnRead && resource.update()
    return () => {
      onCtxSub()
      onStartSub()
      onDoneSub()
    }
  }, [])

  return {
    ...resource,
    ...effects,
    ...state,
  }
}
