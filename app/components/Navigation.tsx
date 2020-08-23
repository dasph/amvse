import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import './styles/navigation.scss'

const links = [['Home', ''], ['QR', 'qr'], ['logout', 'logout']]
const path = location.pathname.slice(1)
const current = links.findIndex(([, p]) => p === path)

export const Navigation = () => {
  const [active, setActive] = useState<number>(current)

  return (
    <nav>
      <ul>
        {links.map(([name, path], i) => (
          <li key={i}>
            <Link className={i === active ? 'active' : ''} onClick={() => setActive(i)} to={`/${path}`}>{name}</Link>
          </li>))}
      </ul>
    </nav>
  )
}
