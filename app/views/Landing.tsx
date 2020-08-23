import React from 'react'
import { request } from '../utils'

import './styles/landing.scss'

type Props = {
  setSession: React.Dispatch<any>
}

const start = (setSession: React.Dispatch<any>) => async () => {
  setSession(void 0)

  const creds = await request<string>('start', { method: 'post' })
  localStorage.setItem('credentials', creds)

  request('getSession').then(setSession)
}

export default ({ setSession }: Props) => (
  <main className='landing-page'>
    <img src='images/landing-logo.svg' />
    <a className='button' onClick={start(setSession)}>s t a r t</a>
  </main>
)
