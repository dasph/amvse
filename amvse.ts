import Koa from 'koa'
import cors from '@koa/cors'
import serve from 'koa-static'
import { ws, api, front } from './src/web'

const { FRONT_PORT, API_PORT, WS_PORT } = process.env

console.log('Ξ Launching @ΛMVSΞ')

new Koa()
  .use(serve('public'))
  .use(front.routes())
  .listen(FRONT_PORT)

new Koa()
  .use(cors())
  .use(api.routes())
  .listen(API_PORT)

new Koa()
  .use(ws.routes())
  .listen(WS_PORT)
