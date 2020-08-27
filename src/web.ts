import send from 'koa-send'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'

import { webSocketHandler, errorHandler, bodyParserError, responseHandler, onStart, onJoin, authorize, onGetSession, onGetState, onSearch, onDelQueue, onMoveQueue, onAddQueue, onQr, onNext, onPlayId, onPrev, onPlay, onToggle } from './service'

export const front = new Router()
  .get(['/qr'], (ctx) => send(ctx, 'public/index.html'))

export const ws = new Router()
  .get('/:token', webSocketHandler)

export const api = new Router()
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

  .get('/play', onPlay)
  .get('/toggle', onToggle)
  .patch('/play', onPlayId)
  .get('/prev', onPrev)
  .get('/next', onNext)

  .get('/qr', onQr)
