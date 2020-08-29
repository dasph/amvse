import React, { useState, useEffect, lazy } from 'react'
import { YouTubePlayer } from 'youtube-player/dist/types'
import { TQueue } from '../typings'
import { request, createRef, WebSocketClient } from '../utils'

import './styles/player.scss'

const YouTube = lazy(() => import('react-youtube'))

type Props = {
  ws: WebSocketClient;
  rank: number;
  queueId: number;
  queue: TQueue[];
  isPlaying: boolean;
}

export const Player = (props: Props) => {
  const { ws, queue, queueId, isPlaying, rank } = props

  const [player, setPlayer] = useState<YouTubePlayer>()
  const [thumb, setThumb] = useState<string>('maxresdefault')
  const playerRef = createRef(player)

  const { videoId, title } = queue.find(({ id }) => id === queueId) || {}

  const toggle = (state: boolean) => {
    state ? playerRef.current.playVideo() : playerRef.current.pauseVideo()
  }

  const prev = () => {
    const i = queue.findIndex(({ id }) => id === queueId) - 1
    request(`play?id=${i >= 0 ? queue[i].id : queue[queue.length - 1].id}`, { method: 'PATCH' })
  }

  const next = () => {
    const i = queue.findIndex(({ id }) => id === queueId) + 1
    request(`play?id=${i < queue.length ? queue[i].id : queue[0].id}`, { method: 'PATCH' })
  }

  useEffect(() => { rank === 0 && ws.on('toggle', toggle) }, [])

  return (
    <div className='player'>
      <span>NOW PLAYING</span>
      {rank === 0 ?
        <YouTube videoId={videoId || 'lep7-tH15MY'} containerClassName='youtube-player'
          onReady={({ target }) => { setPlayer(target); if (isPlaying) target.playVideo() }}
          // onPlay={() => request('play?q=1') }
          // onPause={() => request('play?q=0') }
          onEnd={queue.length ? next : () => playerRef.current.playVideo()}
          opts={{
            host: 'https://www.youtube-nocookie.com',
            playerVars: { hl: 'en', rel: 0, autoplay: 1, modestbranding: 1, origin: location.origin, ...!videoId && { controls: 0 } }
          }}
        /> :
        <>
          <div className='wrapper'>
            <img src={`https://i.ytimg.com/vi/${videoId || 'lep7-tH15MY'}/${thumb}.jpg`} />
          </div>
          <span className='title'>{title}</span>
          <div className='controls'>
            <img src={'images/icon-next.svg'} onClick={prev} />
            <img src={`images/icon-${isPlaying ? 'pause' : 'play'}.svg`} onClick={() => request(`toggle?q=${+!isPlaying}`)} />
            <img src={'images/icon-next.svg'} onClick={next} />
          </div>
        </>
      }
    </div>
  )
}
