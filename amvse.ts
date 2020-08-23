import Koa from 'koa'
import cors from '@koa/cors'
import serve from 'koa-static'
import { ws, api, error, front } from './src/web'

const { FRONT_PORT, BACK_PORT } = process.env

console.log('Ξ Launching @ΛMVSΞ')

new Koa()
  .use(serve('public'))
  .use(front.routes())
  .listen(FRONT_PORT)

new Koa()
  .use(cors())
  .use(ws.routes())
  .use(api.routes())
  .on('error', error)
  .listen(BACK_PORT)
