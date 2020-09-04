import React from 'react'
import { request, setCreds } from '../utils'
import { TSession } from '../typings'

import './styles/landing.scss'

type Props = {
  setSession: React.Dispatch<React.SetStateAction<TSession>>
}

export default function Landing ({ setSession }: Props) {
  const start = async () => {
    setSession(void 0)

    await request<string>('start', { method: 'post' }).then(setCreds)

    request('session').then(setSession)
  }

  return (
    <main className='landing-page'>
      <img src='images/landing-logo.svg' width='256px' height='256px' />
      <a className='button' onClick={start}>s t a r t</a>
    </main>
  )
}
