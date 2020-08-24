import React from 'react'
import { request } from '../utils'

import './styles/landing.scss'

type Props = {
  setSession: React.Dispatch<React.SetStateAction<string>>
}

export default function Landing ({ setSession }: Props) {
  const start = async () => {
    setSession(void 0)

    const creds = await request<string>('start', { method: 'post' })
    localStorage.setItem('credentials', creds)

    request('getSession').then(setSession)
  }

  return (
    <main className='landing-page'>
      <img src='images/landing-logo.svg' />
      <a className='button' onClick={start}>s t a r t</a>
    </main>
  )
}
