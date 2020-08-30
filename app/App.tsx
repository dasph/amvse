import React, { useState, useEffect, Suspense, lazy } from 'react'
import { request, inviteHandler } from './utils'
import { Loader } from './components/Loader'
import { TSession } from './typings'

const Landing = lazy(() => import('./views/Landing'))
const Home = lazy(() => import('./views/Home'))

export const App = () => {
  const [session, setSession] = useState<TSession>()

  useEffect(() => void (async () => {
    await inviteHandler().catch(() => void 0)
    request('session').then(setSession).catch(() => setSession(null))
  })(), [])

  return (
    <Suspense fallback={<Loader />}>
      {session === void 0 ? <Loader /> : session === null ? <Landing setSession={setSession} /> : <Home {...session} />}
    </Suspense>
  )
}
