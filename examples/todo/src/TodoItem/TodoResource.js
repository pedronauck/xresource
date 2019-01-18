import { message } from 'antd'
import { createResource } from 'xresource'
import { emit } from 'kord'

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

      await _.load()
      _.setContext({
        loaded: false,
        showing: true,
      })
    },
    closeModal: _ => {
      _.setContext({ showing: false })
    },
    completeTodo: async (_, id, completed) => {
      _.setContext({ completing: true })
      emit('todo:item-completed', id)
      await api.updateTodo(id, { completed })
      _.setContext({ completing: false })
    },
    deleteTodo: async (_, id) => {
      _.setContext({ deleting: true })
      await api.deleteTodo(id)
      _.setContext({ deleteing: false })
      emit('todo:item-deleted', id)
      message.success('Successfully deleted')
    },
  },
}))
