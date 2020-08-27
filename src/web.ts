import send from 'koa-send'
import Router from 'koa-router'

import { webSocketHandler, errorHandler, responseHandler, onStart, onJoin, authorize, onQr, onGetSession, onSearch, onGetQueue, onAddQueue, onDelQueue, onMoveQueue, onPlay, onToggle } from './service'

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
  .get('/getSession', onGetSession)

  .get('/search', onSearch)

  .get('/queue', onGetQueue)
  .put('/queue', onAddQueue)
  .del('/queue', onDelQueue)
  .patch('/queue', onMoveQueue)

  .patch('/play', onPlay)
  .get('/toggle', onToggle)
