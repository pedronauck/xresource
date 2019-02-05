import { AxiosClient, ClientOpts, ClientInstance } from './AxiosClient'

export function createClient(opts: ClientOpts): ClientInstance {
  const axiosClient = new AxiosClient(opts)
  return axiosClient.client
}

export * from './AxiosClient'
