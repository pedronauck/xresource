import { useContext } from 'react'
import { ctx as clientCtx } from './Provider'

export const useClient = () => {
  return useContext(clientCtx)
}
