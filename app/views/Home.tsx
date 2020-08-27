import React, { useState, useEffect } from 'react'
import { BrowserRouter, Route } from 'react-router-dom'
import { request, createRef, WebSocketClient } from '../utils'
import { Qr } from './Qr'
import { Queue } from '../components/Queue'
import { Loader } from '../components/Loader'
import { Logout } from '../components/Logout'
import { Player } from '../components/Player'
import { Navigation } from '../components/Navigation'

import { TSession, TQueue } from '../typings'

import './styles/home.scss'

const ws = new WebSocketClient()

export default function Home (props: TSession) {
  const [queue, setQueue] = useState<TQueue[]>()
  const [queueId, setQueueId] = useState<number>(props.queueId)
  const [isPlaying, setPlaying] = useState<boolean>(props.isPlaying)

  const queueRef = createRef(queue)

  const addQueue = async (payload: TQueue) => {
    setQueue([...queueRef.current, payload])
  }

  const delQueue = (id: number) => {
    setQueue(queueRef.current.filter((q) => id !== q.id))
  }

  const moveQueue = ({ id, pos }: { id: number, pos: number }) => {
    const old = queueRef.current.find((q) => id === q.id)?.position

    if (!old) return

    const sign = pos - old < 0
    const [from, to] = sign ? [pos, old] : [old, pos]

    const q = queueRef.current
      .map((q) => { if (q.position >= from && q.position <= to) q.position += sign ? 1 : -1; return q })
      .map((q) => { if (q.id === id) q.position = pos; return q })
      .sort(({ position: a }, { position: b }) => a - b)

    setQueue(q)
  }

  useEffect(() => void (async () => {
    await ws.open()
    const queue = await request<TQueue[]>('queue')
    setQueue(queue)

    ws.on('addQueue', addQueue)
      .on('delQueue', delQueue)
      .on('moveQueue', moveQueue)
      .on('play', setQueueId)
      .on('toggle', setPlaying)
  })(), [])

  return queue ?
    <BrowserRouter>
      <Navigation />
      <Route path='/qr'>
        <main className='qr'>
          <Qr />
        </main>
      </Route>
      <Route path='/logout'>
        <Logout />
      </Route>
      <Route path='/'>
        <main className='home'>
          <Player ws={ws} rank={props.rank} queueId={queueId} queue={queue} isPlaying={isPlaying} />
          <Queue queueId={queueId} queue={queue} />
        </main>
      </Route>
    </BrowserRouter> :
    <Loader />
}
