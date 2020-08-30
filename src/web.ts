import send from 'koa-send'
import Router from 'koa-router'

import { webSocketHandler, errorHandler, responseHandler, onStart, onJoin, authorize, onQr, onSearch, onSession, onGetQueue, onAddQueue, onDelQueue, onMoveQueue, onSetQueueId, onPlayer } from './service'

export const front = new Router()
  .get(['/qr'], (ctx) => send(ctx, 'public/index.html'))

export const ws = new Router()
  .get('/:token', webSocketHandler)

export const api = new Router()
  .use(errorHandler)
  .use(responseHandler)

  .post('/start', onStart)
  .get('/join', onJoin)

  .use(authorize)

  .get('/qr', onQr)
  .get('/search', onSearch)
  .get('/session', onSession)

  .get('/queue', onGetQueue)
  .put('/queue', onAddQueue)
  .del('/queue', onDelQueue)
  .patch('/queue', onMoveQueue)
  .post('/queue', onSetQueueId)

  .patch('/player', onPlayer)
