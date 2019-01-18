import { message } from 'antd'
import { createResource } from 'xresource'
import { emit } from 'kord'

import * as api from '../api'

export const TodoResource = createResource(item => ({
  context: {
    showing: false,
    deleting: false,
    loaded: false,
  },
  data: {
    todo: {
      source: async () => api.getTodo(item.id),
    },
  },
  mutations: {
    SET_SHOWING: (ctx, showing) => ({ ...ctx, showing }),
    SET_LOADED: (ctx, loaded) => ({ ...ctx, loaded }),
    SET_DELETING: (ctx, deleting) => ({ ...ctx, deleting }),
  },
  effects: {
    openModal: async ({ getContext, send, update }) => {
      const ctx = getContext()

      if (ctx.loaded) {
        send('SET_SHOWING', true)
        return
      }

      await update()
      send('SET_LOADED', true)
      send('SET_SHOWING', true)
    },
    closeModal: ({ send }) => {
      send('SET_SHOWING', false)
    },
    completeTodo: async ({ send }, id, completed) => {
      emit('todo:item-completed', id)
      await api.updateTodo(id, { completed })
      send('SET_SHOWING', false)
    },
    deleteTodo: async ({ send }, id) => {
      send('SET_DELETING', true)
      await api.deleteTodo(id)
      send('SET_DELETING', false)
      emit('todo:item-deleted', id)
      message.success('Successfully deleted')
    },
  },
}))
