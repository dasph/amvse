import send from 'koa-send'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'

import { koaErrorHandler, webSocketHandler, errorHandler, bodyParserError, responseHandler, onStart, onJoin, authorize, onGetSession, onGetState, onSearch, onDelQueue, onMoveQueue, onAddQueue, onQr, onNext } from './service'

export { koaErrorHandler as error }

export const front = new Router()
  .get(['/qr'], (ctx) => send(ctx, 'public/index.html'))

export const ws = new Router({ prefix: '/ws' })
  .get('/:token', webSocketHandler)

export const api = new Router({ prefix: '/api' })
  .use(errorHandler)
  .use(bodyParser({ onerror: bodyParserError }))
  .use(responseHandler)
  .post('/start', onStart)
  .get('/join', onJoin)

  .use(authorize)
  .get('/getSession', onGetSession)
  .get('/getState', onGetState)

  .get('/search', onSearch)
  .put('/queue', onAddQueue)
  .del('/queue', onDelQueue)
  .patch('/queue', onMoveQueue)

  .get('/next', onNext)

  .get('/qr', onQr)
