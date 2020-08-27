import React, { useState, useEffect } from 'react'
import { YouTubePlayer } from 'youtube-player/dist/types'
import { TSessionQueue } from '../typings'
import { request, WebSocketClient } from '../utils'

import './styles/player.scss'

type Props = {
  ws: WebSocketClient;
  queueId: number;
  queue: TSessionQueue[];
}

export default function Player (props: Props) {
  const [videoId, setVideoId] = useState<string>(props.queue.find(({ id }) => id === props.queueId)?.videoId)
  const [player, setPlayer] = useState<YouTubePlayer>()
  const [queue, setQueue] = useState<TSessionQueue[]>(props.queue)

  const delQueue = (id: number) => {
    const q = queue.filter((v) => id !== v.id)
    setQueue(q)
  }

  const moveQueue = ({ id, pos }: { id: number, pos: number }) => {
    const old = queue.find((q) => id === q.id)?.position

    if (!old) return

    const sign = pos - old < 0
    const [from, to] = sign ? [pos, old] : [old, pos]

    const q = queue
      .map((q) => { if (q.position >= from && q.position <= to) q.position += sign ? 1 : -1; return q })
      .map((q) => { if (q.id === id) q.position = pos; return q })
      .sort(({ position: a }, { position: b }) => a - b)

    setQueue(q)
  }

  const addQueue = async (payload: TSessionQueue) => {
    setQueue([...queue, payload])
  }

  props.ws
    .on('addQueue', addQueue)
    .on('delQueue', delQueue)
    .on('moveQueue', moveQueue)

  useEffect(() => {
    if (!player || !queue?.length) return
    player.cuePlaylist(queue.map(({ videoId }) => videoId))
  }, [queue])

  return (
    <div className='player'>
      <span>PLAYER</span>
    </div>
  )
}
