import React, { useState, useEffect } from 'react'
import { request } from '../utils'
import { Loader } from '../components/Loader'

import './styles/qr.scss'

const { createObjectURL } = URL

export const Qr = () => {
  const [qr, setQr] = useState<string>(null)

  useEffect(() => {
    request<string>('qr').then((data) => setQr(createObjectURL(new Blob([data], { type: 'image/svg+xml' }))))
  }, [])

  return (
    <main className='qr'>
      {qr ? <img src={qr} /> : <Loader />}
    </main>
  )
}
