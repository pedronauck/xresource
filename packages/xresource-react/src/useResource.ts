import { useState, useEffect, useContext } from 'react'
import { Resource, ErrorMap, ResourceInstance } from 'xresource'

import { ctx as clientCtx } from './Provider'

export interface UseResource<C, D> extends Resource<C, D> {
  ctx: C
  data: D
  error: ErrorMap<D>
  loading: boolean
}

export interface UseResourceOpts<C, D> {
  readOnMount?: ((resource: Resource<C, D>) => boolean) | boolean
}

export function useResource<C = any, D = any>(
  instance: ResourceInstance<C, D>,
  opts: UseResourceOpts<C, D> = { readOnMount: true }
): UseResource<C, D> {
  const client = useContext(clientCtx)
  const [resource] = useState(() => instance.create(client))
  const { context$, data$, error$, onReadNext, onReadStart } = resource
  const readOnMount =
    typeof opts.readOnMount === 'function'
      ? opts.readOnMount(resource)
      : Boolean(opts.readOnMount)

  const [ctx, setCtx] = useState(context$.value)
  const [data, setData] = useState(data$.value)
  const [error, setError] = useState(error$.value)
  const [loading, setLoading] = useState(readOnMount)

  useEffect(() => {
    context$.subscribe(setCtx)
    data$.subscribe(setData)
    error$.subscribe(setError)
    onReadStart(() => setLoading(true))
    onReadNext(() => setLoading(false))
    readOnMount && resource.read()
    return () => {
      resource.stop()
    }
  }, [])

  return {
    ...resource,
    ctx,
    data,
    loading,
    error,
  }
}
