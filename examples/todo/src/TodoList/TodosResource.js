import { createResource } from 'xresource'
import match from 'match-sorter'

import * as api from '../api'

const findByQuery = (ctx, todos) => {
  if (!ctx.query.length) return todos
  return match(todos, ctx.query, { keys: ['title'] })
}

const filterByFilter = (ctx, todos) => {
  if (ctx.filter === 'all') return todos
  return todos.filter(todo => todo.completed)
}

const deleteOnList = (todos, id) => {
  return todos.filter(todo => todo.id !== id)
}

const setCompleted = (todos, id) =>
  todos.map(todo => {
    if (todo.id !== id) return todo
    return { ...todo, completed: !todo.completed }
  })

export const TodosResource = createResource(() => ({
  context: {
    query: '',
    filter: 'all',
  },
  data: {
    todos: {
      source: api.getTodos,
      modifiers: [findByQuery, filterByFilter],
    },
  },
  mutations: {
    SET_QUERY: (ctx, query) => ({ ...ctx, query }),
    SET_FILTER: (ctx, filter) => ({ ...ctx, filter }),
  },
  effects: {
    deleteOnList: ({ setData }, id) => {
      setData(prev => ({ todos: deleteOnList(prev.todos, id) }))
    },
    setCompleted: ({ setData }, id) => {
      setData(prev => ({ todos: setCompleted(prev.todos, id) }))
    },
    addOnList: ({ setData }, todo) => {
      setData(prev => ({ todos: prev.todos.concat([todo]) }))
    },
  },
}))
