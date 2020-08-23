import React, { useState, useEffect, lazy } from 'react'
import { BrowserRouter, Route } from 'react-router-dom'
import { request, WebSocketClient } from '../utils'
import { Qr } from './Qr'
import { Logout } from '../components/Logout'
import { Loader } from '../components/Loader'
import { Queue } from '../components/Queue'
import { Navigation } from '../components/Navigation'

import { TSessionState } from '../typings'

import './styles/home.scss'

const Player = lazy(() => import('../components/Player'))

const ws = new WebSocketClient()

export default () => {
  const [state, setState] = useState<TSessionState>()

  useEffect(() => void ws.open().then(() => request('getState').then(setState)), [])

  return state ? <>
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
          {state.rank === 0 && <Player ws={ws} queue={state.queue} videoId={state.queue.find(({ id }) => id === state.queueId)?.videoId} /> }
          <Queue ws={ws}  queueId={state.queueId} queue={state.queue} />
        </main>
      </Route>
    </BrowserRouter>
    </> :
    <Loader />
}
