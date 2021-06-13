import WebSocket from 'ws'
import { imageSync } from 'qr-image'
import { Sequelize, Op } from 'sequelize'
import { createHmac, Hmac } from 'crypto'
import { fetch } from './fetch'
import { Session, Video, Queue } from './models'
import { IMiddleware, TCredentials, TAuthorizedMiddleware, YoutubeSearchResult, YoutubeVideoResult, TInvite } from '../typings/web'

const { HASH_KEY, HREF, proxyHost } = process.env

export class ApiError extends Error { constructor (public code: number, message?: string) { super(message) } }

export const wss = new WebSocket.Server({ noServer: true, clientTracking: true })

export const wsCreds = new WeakMap<WebSocket, TCredentials>()

export const errorHandler: IMiddleware = async (ctx, next) => {
  return next().catch((err: ApiError) => ctx.body = { code: err.code || 400, error: err instanceof ApiError ? err.message : 'Something bad has happened' })
}

export const responseHandler: IMiddleware = async (ctx, next) => {
  return next().then(() => ctx.body = { code: 200, data: ctx.state.data })
}

export const webSocketHandler: IMiddleware = async (ctx) => {
  if (ctx.request.header.upgrade !== 'websocket') return ctx.status = 400

  const [creds, ws] = await Promise.all([
    verify<TCredentials>(decodeURIComponent(ctx.params.token)),
    new Promise<WebSocket>((resolve) => wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), resolve))
  ]).catch(() => ([]))

  if (!creds || !ws) return ctx.status = 401

  wsCreds.set(ws, creds)
  ctx.respond = false
}

const wsEmit = <T> (sess: string, event: string, payload: T) => {
  wss.clients.forEach((ws) => wsCreds.get(ws)?.session === sess && ws.send(JSON.stringify({ event, payload })))
}

const hashPayload = <T> (obj: T) => {
  return Object.values(obj).reduce((a: Hmac, c) => a.update(`${c}`), createHmac('sha256', HASH_KEY || '')).digest('base64')
}

const sign = <T> (payload: T) => {
  const signed = Date.now()
  const hash = hashPayload({ ...payload, signed })
  const str = JSON.stringify({ ...payload, signed, hash })

  return Buffer.from(str).toString('base64')
}

const verify = async <T> (token: string) => {
  const str = Buffer.from(token, 'base64').toString()
  const { hash, ...payload } = JSON.parse(str) as T & { hash: string }
  const hmac = hashPayload(payload)

  if (hash !== hmac) throw new ApiError(401, 'Hashes do not match')
  return payload
}

export const authorize: IMiddleware = async (ctx, next) => {
  const auth = ctx.header.authorization as unknown
  if (!auth || typeof auth !== 'string') throw new ApiError(401, 'Unauthorized')

  const [type, token] = auth.split(' ')
  if (type !== 'Basic') throw new ApiError(400, 'Invalid token type')
  const creds = await verify<TCredentials>(token)

  if (Date.now() - creds.signed > 864e5) throw new ApiError(410, 'Session has expired')
  ctx.state = creds
  await next()
}

export const onStart: IMiddleware = async (ctx) => {
  const sess = await Session.create()
  const payload = { session: sess.id, rank: 0 }

  ctx.state.data = sign(payload)
}

export const onJoin: IMiddleware = async (ctx) => {
  const { invite } = ctx.query
  if (!invite) throw new ApiError(400, 'Bad request')

  const { session, signed } = await verify<TInvite>(decodeURIComponent(invite))
  if (Date.now() - signed > 864e5) throw new ApiError(410, 'Invitation has expired')

  const sess = await Session.findByPk(session)
  if (!sess) throw new ApiError(404, 'Session not found')

  ctx.state.data = sign({ session, rank: 3 })
}

export const onSession: TAuthorizedMiddleware = async (ctx) => {
  const { session, rank } = ctx.state

  const sess = await Session.findByPk(session)
  if (!sess) throw new ApiError(404, 'Session not found')

  const payload = { rank, queueId: sess.queueId, isPlaying: sess.isPlaying }

  ctx.state.data = payload
}

export const onGetQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state

  const raw = await Queue.findAll({ where: { sessionId: session }, attributes: { exclude: ['sessionId'] }, include: { model: Video, attributes: { exclude: ['id', 'createdAt'] } }, order: ['position'], raw: true, nest: true })
  const queue = raw.map(({ video, ...rest }) => ({ ...video, ...rest }))

  ctx.state.data = queue
}

export const onAddQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state
  const videoId = ctx.query.id as string

  if (!videoId) throw new ApiError(400, 'Bad id value')

  const video = await Video.findByPk(videoId)
  if (!video) throw new ApiError(404, 'Video not found')

  const [q] = await Queue.bulkCreate([{ sessionId: session, videoId }])

  const { id, position, createdAt, addedBy } = q
  const { title, channel, duration, uploaded } = video

  const payload = { id, position, title, channel, duration, uploaded, createdAt, addedBy, videoId }

  wsEmit(session, 'addQueue', payload)
}

export const onDelQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state
  const id = +ctx.query.id

  if (!id || !Number.isInteger(id)) throw new ApiError(400, 'Bad id value')

  Queue.destroy({ where: { id, sessionId: session } })
  wsEmit(session, 'delQueue', id)
}

export const onMoveQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state
  const id = +ctx.query.id
  const pos = +ctx.query.pos

  if (!id || !Number.isInteger(id)) throw new ApiError(400, 'Bad id value')
  if (!pos || !Number.isInteger(pos) || pos < 1) throw new ApiError(400, 'Bad position value')

  const queue = await Queue.findOne({ where: { id, sessionId: session } })
  if (!queue) throw new ApiError(404, 'Queue not found')

  if (pos === queue.position) return

  const sign = pos - queue.position < 0
  const between = sign ? [pos, queue.position] : [queue.position, pos]
  const position = Sequelize.literal(`position ${sign ? '+' : '-'} 1`)

  await Queue.update({ position }, { where: { position: { [Op.between]: between }, sessionId: session } })
  queue.update({ position: pos })

  wsEmit(session, 'moveQueue', { id, pos })
}

export const onSearch: TAuthorizedMiddleware = async (ctx) => {
  const { query, offset } = ctx.query

  if (!query || query.length < 3) throw new ApiError(400, 'Bad Request')

  const res = await fetch<YoutubeSearchResult>({ hostname: proxyHost, path: `/youtube?query=${encodeURIComponent(query)}&offset=${offset || 0}` }).then(({ json }) => json)

  const formated = res.data.map(({ id, title, uploadedAt, views, author, duration }) => {
    const ago = uploadedAt?.split(' ')[0]

    return {
      id,
      views,
      title: title.length > 64 ? `${title.slice(0, 61)}...` : title,
      duration: duration.split(':').reverse().reduce((a, c, i) => a + +c * 60 ** i, 0),
      uploaded: Date.now() - (uploadedAt ? uploadedAt.indexOf('year') !== -1 ? +ago * 3.1536e10 : uploadedAt.indexOf('month') !== -1 ? +ago * 2.592e9 : uploadedAt.indexOf('week') !== -1 ? +ago * 6.048e8 : uploadedAt.indexOf('day') !== -1 ? +ago * 8.64e7 : 0 : 0),
      channel: author.length > 64 ? `${author.slice(0, 61)}...` : author
    }
  })

  Video.bulkCreate(formated, { ignoreDuplicates: true })

  ctx.state.data = formated
}

export const onQr: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state

  const token = sign({ session })
  const url = `${HREF}/#${encodeURIComponent(token)}`
  const data = imageSync(url, { type: 'svg', margin: 0 }).toString('base64')

  ctx.state.data = data
}

export const onSetQueueId: TAuthorizedMiddleware = async (ctx) => {
  const id = +ctx.query.id
  const { session } = ctx.state

  if (!id || !Number.isInteger(id)) throw new ApiError(400, 'Bad id value')

  const queue = await Queue.findOne({ where: { id, sessionId: session } })
  if (!queue) throw new ApiError(404, 'Queue not found')

  Session.update({ queueId: id }, { where: { id: session } })
  wsEmit(session, 'setQueueId', id)
}

export const onPlayer: TAuthorizedMiddleware = async (ctx) => {
  const { q, emit } = ctx.query
  const { session, rank } = ctx.state

  const isPlaying = q === '0' ? false : q === '1' ? true : null
  if (isPlaying === null) throw new ApiError(400, 'Bad state value')

  if (rank === 0) Session.update({ isPlaying }, { where: { id: session } })
  if (emit === '') wsEmit(session, 'isPlaying', isPlaying)
}
