import * as React from 'react'
import { SFC } from 'react'
import { createContext } from 'react'

export const ctx = createContext<any>(null)

export interface ProviderProps {
  client: any
}

export const Provider: SFC<ProviderProps> = ({ client, children }) => {
  return <ctx.Provider value={client}>{children}</ctx.Provider>
}
