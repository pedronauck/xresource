import { GraphQLClient } from 'gery'
import gql from 'gql-tag'

const client = new GraphQLClient({
  endpoint:
    'https://api-euwest.graphcms.com/v1/cjqxsbo7x8wsu01dnqo5pyvye/master',
  headers: {
    authorization:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJ0b2tlbklkIjoiNDQ2ZjRlZWItMmU2Ni00OGVhLWFhN2ItNTYzMDBmNzdjYzU1In0.WndxPk5pJTRJ6WA5Kk_lxT0wk-o1xAhuf_X4z1HA3nA',
  },
})

const GET_TODOS = gql`
  query getTodos {
    todoes {
      id
      title
      completed
    }
  }
`

const GET_TODO = gql`
  query getTodo($id: ID) {
    todo(where: { id: $id }) {
      id
      title
      completed
      dueDate
      body
    }
  }
`

const UPDATE_TODO = gql`
  mutation updateTodo($id: ID, $data: TodoUpdateInput!) {
    updateTodo(where: { id: $id }, data: $data) {
      id
    }
  }
`

const DELETE_TODO = gql`
  mutation deleteTodo($id: ID) {
    deleteTodo(where: { id: $id }) {
      id
    }
  }
`

const CREATE_TODO = gql`
  mutation createTodo($data: TodoCreateInput!) {
    createTodo(data: $data) {
      id
      title
      completed
    }
  }
`

export const getTodos = async () => {
  const res = await client.query(GET_TODOS)
  return res.todoes
}

export const getTodo = async id => {
  const res = await client.query(GET_TODO, { id })
  return res.todo
}

export const createTodo = async data => {
  const res = await client.query(CREATE_TODO, { data })
  return res.createTodo
}

export const updateTodo = async (id, data) => {
  await client.query(UPDATE_TODO, { id, data })
}

export const deleteTodo = async id => {
  await client.query(DELETE_TODO, { id })
}
