import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Route } from 'react-router-dom'
import { request, WebSocketClient } from '../utils'
import { Qr } from './Qr'
import { Logout } from '../components/Logout'
import { Loader } from '../components/Loader'
import { Player } from '../components/Player'
import { Queue } from '../components/Queue'
import { Navigation } from '../components/Navigation'

import { TSessionState, TSessionQueue } from '../typings'

import './styles/home.scss'

type Props = {
  rank: number;
}

const createRef = <T extends unknown>(obj: T) => {
  const ref = useRef(obj)
  ref.current = obj
  return ref
}

const ws = new WebSocketClient()

export default function Home (props: Props) {
  const [queue, setQueue] = useState<TSessionQueue[]>()
  const [queueId, setQueueId] = useState<number>()
  const [isPlaying, setPlaying] = useState<boolean>()

  const queueRef = createRef(queue)

  const addQueue = async (payload: TSessionQueue) => {
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
    const { queue, queueId, isPlaying } = await request<TSessionState>('getState')
    setQueue(queue)
    setQueueId(queueId)
    setPlaying(isPlaying)

    ws.on('addQueue', addQueue)
      .on('delQueue', delQueue)
      .on('moveQueue', moveQueue)
      .on('playId', setQueueId)
      .on('play', setPlaying)
  })(), [])

  return queue ? <>
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
    </BrowserRouter>
    </> :
    <Loader />
}
