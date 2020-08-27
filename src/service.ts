import WebSocket from 'ws'
import { imageSync } from 'qr-image'
import { Sequelize, Op } from 'sequelize'
import ytDuration from 'iso8601-duration'
import { createHmac, Hmac } from 'crypto'
import { AllHtmlEntities } from 'html-entities'
import { fetch } from './fetch'
import { Session, Video, Queue } from './models'
import { IMiddleware, TCredentials, TAuthorizedMiddleware, YoutubeSearchResult, YoutubeVideoResult, TInvite } from '../typings/web'
import { TQueue } from '../typings/models'


const { HASH_KEY, YOUTUBE, HREF } = process.env

export class ApiError extends Error { constructor (public code: number, message?: string) { super(message) } }

export const wss = new WebSocket.Server({ noServer: true, clientTracking: true })

export const wsCreds = new WeakMap<WebSocket, TCredentials>()

export const errorHandler: IMiddleware = async (ctx, next) => {
  return next().catch((err: ApiError) => ctx.body = { code: err.code || 400, error: err instanceof ApiError ? err.message : 'Something bad has happened' })
}

export const responseHandler: IMiddleware = async (ctx, next) => {
  return next().then(() => ctx.body = { code: 200, data: ctx.state.data })
}

export const bodyParserError = () => {
  throw new ApiError(400, 'Bad Request')
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

const wsEmit = <T>(sess: string, event: string, payload: T) => {
  wss.clients.forEach((ws) => wsCreds.get(ws)?.session === sess && ws.send(JSON.stringify({ event, payload })))
}

const hashPayload = <T>(obj: T) => Object.values(obj).reduce((a: Hmac, c) => a.update(`${c}`), createHmac('sha256', HASH_KEY || '')).digest('base64')

const sign = <T>(payload: T) => {
  const signed = Date.now()
  const hash = hashPayload({ ...payload, signed })
  const str = JSON.stringify({ ...payload, signed, hash })

  return Buffer.from(str).toString('base64')
}

const verify = async <T>(token: string) => {
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
  const payload = { session: sess.uuid, rank: 0 }

  ctx.state.data = sign(payload)
}

export const onJoin: IMiddleware = async (ctx) => {
  const { invite } = ctx.query
  if (!invite) throw new ApiError(400, 'Bad request')

  const { session, signed } = await verify<TInvite>(decodeURIComponent(invite))
  if (Date.now() - signed > 864e5) throw new ApiError(410, 'Invitation has expired')

  const sess = await Session.findOne({ where: { uuid: session } })
  if (!sess) throw new ApiError(404, 'Session not found')

  ctx.state.data = sign({ session, rank: 3 })
}

export const onGetSession: TAuthorizedMiddleware = async (ctx) => {
  const { session, rank } = ctx.state

  const sess = await Session.findOne({ where: { uuid: session } })
  if (!sess) throw new ApiError(404, 'Session not found')

  ctx.state.data = { session, rank }
}

export const onGetState: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state

  const sess = await Session.findOne({ where: { uuid: session } })
  if (!sess) throw new ApiError(404, 'Session not found')

  const videos = await sess.getVideos({ attributes: { exclude: ['id', 'createdAt'] }, joinTableAttributes: { exclude: ['sessionId'] }, order: Sequelize.literal('queue.position'), raw: true, nest: true })
  const queue = videos.map((({ queue, ...rest }) => ({ ...rest, ...queue })))

  const payload = { queue, queueId: sess.queueId }

  ctx.state.data = payload
}

export const onAddQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state
  const vid = ctx.query.id as string

  if (!vid) throw new ApiError(400, 'Bad id value')

  const sess = await Session.findOne({ where: { uuid: session } })
  if (!sess) throw new ApiError(404, 'Session not found')

  const video = await Video.findOne({ where: { id: vid } })
  if (!video) throw new ApiError(404, 'Video not found')

  const [q] = await Queue.bulkCreate([{ sessionId: sess.id, videoId: vid }])

  const { id, position, createdAt, addedBy } = q.toJSON() as TQueue

  const { title, channel, duration, uploaded } = video
  const payload = { id, position, title, channel, duration, uploaded, createdAt, addedBy, videoId: vid }

  wsEmit(session, 'addQueue', payload)

  if (!sess.queueId) {
    await sess.update({ queueId: id })
    wsEmit(session, 'setQueueId', id)
    wsEmit(session, 'setVideoId', vid)
  }
}

export const onDelQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state
  const id = +ctx.query.id

  if (!id || !Number.isInteger(id)) throw new ApiError(400, 'Bad id value')

  const sess = await Session.findOne({ where: { uuid: session }, attributes: ['id'] })
  if (!sess) throw new ApiError(404, 'Session not found')

  Queue.destroy({ where: { id, sessionId: sess.id } })

  wsEmit(session, 'delQueue', id)
}

export const onMoveQueue: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state
  const id = +ctx.query.id
  const pos = +ctx.query.pos

  if (!id || !Number.isInteger(id)) throw new ApiError(400, 'Bad id value')
  if (!pos || !Number.isInteger(pos) || pos < 1 ) throw new ApiError(400, 'Bad position value')

  const sess = await Session.findOne({ where: { uuid: session }, attributes: ['id'] })
  if (!sess) throw new ApiError(404, 'Session not found')

  const queue = await Queue.findOne({ where: { id, sessionId: sess.id } })
  if (!queue) throw new ApiError(404, 'Queue not found')

  if (pos === queue.position) return

  const sign = pos - queue.position < 0
  const between = sign ? [pos, queue.position] : [queue.position, pos]
  const position = Sequelize.literal(`position ${sign ? '+' : '-'} 1`)
  await Queue.update({ position }, { where: { position: { [Op.between]: between }, sessionId: sess.id } })
  queue.update({ position: pos })

  wsEmit(session, 'moveQueue', { id, pos })
}

export const onSearch: TAuthorizedMiddleware = async (ctx) => {
  const { query, page } = ctx.query

  if (!query || query.length < 3) throw new ApiError(400, 'Bad Request')

  const res = await fetch<YoutubeSearchResult>({
    hostname: 'www.googleapis.com',
    path: `/youtube/v3/search?q=${encodeURIComponent(query)}&maxResults=50&type=video&part=snippet&fields=nextPageToken,items(id(videoId),snippet(publishedAt,title,channelTitle))${page ? `&pageToken=${page}` : ''}&key=${YOUTUBE}`
  }).then(({ json }) => json)

  const ids = res.items.map(({ id: { videoId } }) => videoId).join(',')

  const details = await fetch<YoutubeVideoResult>({
    hostname: 'www.googleapis.com',
    path: `/youtube/v3/videos?id=${ids}&part=contentDetails&fields=items(id,contentDetails(duration))&key=${YOUTUBE}`
  }).then(({ json }) => json)

  const durs = Object.fromEntries(details.items.map(({ id, contentDetails: { duration } }) => ([id, ytDuration.toSeconds(ytDuration.parse(duration))])))

  const formated = res.items.map(({ id: { videoId }, snippet: { channelTitle, publishedAt, title } }) => ({
    id: videoId,
    channel: channelTitle.length > 64 ? `${channelTitle.slice(0, 61)}...` : channelTitle,
    uploaded: publishedAt,
    duration: durs[videoId],
    title: AllHtmlEntities.decode(title.length > 64 ? `${title.slice(0, 61)}...` : title)
  }))

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

export const onNext: TAuthorizedMiddleware = async (ctx) => {
  const { session } = ctx.state

  const sess = await Session.findOne({ where: { uuid: session }, attributes: ['id', 'queueId'] })
  if (!sess) throw new ApiError(404, 'Session not found')

  const queue = await Queue.findOne({ where: { id: sess.queueId , sessionId: sess.id } })
  if (!queue) throw new ApiError(404, 'Queue not found')

  const next = await Queue.findOne({ where: { sessionId: sess.id, position: { [Op.gt]: queue.position } }, order: ['position'] })
  const id = next?.id || null

  sess.update({ queueId: id })
  wsEmit(session, 'playId', id)
}

export const onPlayId: TAuthorizedMiddleware = async (ctx) => {
  const id = +ctx.query.id
  const { session } = ctx.state

  if (!id || !Number.isInteger(id)) throw new ApiError(400, 'Bad id value')

  const sess = await Session.findOne({ where: { uuid: session }, attributes: ['id', 'queueId'] })
  if (!sess) throw new ApiError(404, 'Session not found')

  const queue = await Queue.findOne({ where: { id , sessionId: sess.id } })
  if (!queue) throw new ApiError(404, 'Queue not found')

  sess.update({ queueId: id })
  wsEmit(session, 'playId', id)
}
