import { AxiosResponse } from 'axios'
import {
  AxiosClient,
  ClientOpts,
  ClientInstance,
} from '@xresource/client-axios'
export * from '@xresource/client-axios'

export type Variables = Record<string, any>
export interface GraphQLClientInstance extends ClientInstance {
  exec(query: string, variables?: Variables): Promise<AxiosResponse>
}

export class GraphQLClient extends AxiosClient {
  constructor(opts: ClientOpts) {
    super(opts)
  }

  get client(): GraphQLClientInstance {
    const client = this.__client
    const exec = async (query: string, variables?: Variables) =>
      client.post('/', {
        query,
        variables,
      })

    return Object.assign(client, { exec })
  }
}

export function createClient(opts: ClientOpts): GraphQLClientInstance {
  const instance = new GraphQLClient(opts)
  return instance.client
}
