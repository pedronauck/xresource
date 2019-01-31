import { message } from 'antd'
import { createResource } from 'xresource'

import * as api from '../api'

export const TodoResource = createResource(item => ({
  context: {
    showing: false,
    completing: false,
    deleting: false,
    loaded: false,
  },
  data: {
    todo: {
      source: async () => api.getTodo(item.id),
    },
  },
  handlers: {
    openModal: async _ => {
      const ctx = _.getContext()

      if (ctx.loaded) {
        _.setContext({ showing: true })
        return
      }

      await _.read()
      _.setContext({
        loaded: true,
        showing: true,
      })
    },
    closeModal: _ => {
      _.setContext({ showing: false })
    },
    completeTodo: async (_, id, completed) => {
      _.setContext({ completing: true })
      _.broadcast('todos:TOGGLE_BLOCKED')
      await api.updateTodo(id, { completed })
      _.setContext({ completing: false })
      _.broadcast('todos:TOGGLE_BLOCKED')
      _.broadcast('todos:COMPLETE_ITEM', id)
    },
    deleteTodo: async (_, id) => {
      _.setContext({ deleting: true })
      await api.deleteTodo(id)
      _.setContext({ deleting: false })
      _.broadcast('todos:DELETE_ITEM', id)
      message.success('Successfully deleted')
    },
  },
}))
