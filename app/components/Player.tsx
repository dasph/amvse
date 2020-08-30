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

const quality = ['maxres', 'sd', 'hq', 'mq', '']

export const Player = (props: Props) => {
  const { ws, queue, queueId, rank } = props

  const [thumb, setThumb] = useState<number>(0)
  const [player, setPlayer] = useState<YouTubePlayer>()
  const [isPlaying, setPlaying] = useState<boolean>(props.isPlaying)

  const playerRef = createRef(player)

  const { videoId, title } = queue.find(({ id }) => id === queueId) || {}

  const togglePlayer = (state: boolean) => {
    setPlaying(state)
    if (rank === 0 && playerRef.current.getPlayerState() !== 3) state ? playerRef.current.playVideo() : playerRef.current.pauseVideo()
  }

  const prev = () => {
    const i = queue.findIndex(({ id }) => id === queueId) - 1
    request(`queue?id=${i >= 0 ? queue[i].id : queue[queue.length - 1].id}`, { method: 'POST' })
  }

  const next = () => {
    const i = queue.findIndex(({ id }) => id === queueId) + 1
    request(`queue?id=${i < queue.length ? queue[i].id : queue[0].id}`, { method: 'POST' })
  }

  useEffect(() => { ws.on('isPlaying', togglePlayer) }, [])
  useEffect(() => { setThumb(0) }, [videoId])

  return (
    <div className='player'>
      <span>NOW PLAYING</span>
      {rank === 0 ?
        <YouTube videoId={videoId || 'lep7-tH15MY'} containerClassName='youtube-player'
          onReady={({ target }) => setPlayer(target)}
          onPlay={() => request(`player?q=1${!isPlaying ? '&emit' : ''}`, { method: 'PATCH' })}
          onPause={() => request(`player?q=0${isPlaying ? '&emit' : ''}`, { method: 'PATCH' })}
          onEnd={queue.length ? next : () => playerRef.current.playVideo()}
          opts={{
            host: 'https://www.youtube-nocookie.com',
            playerVars: { hl: 'en', rel: 0, autoplay: 1, modestbranding: 1, origin: location.origin, ...!videoId && { controls: 0 } }
          }}
        /> :
        <>
          <div className='wrapper'>
            <img
              src={`https://i.ytimg.com/vi/${videoId || 'lep7-tH15MY'}/${quality[thumb]}default.jpg`}
              onLoad={({ currentTarget }) => currentTarget.naturalWidth === 120 && thumb < 4 && setThumb(thumb + 1)}
            />
          </div>
          <span className='title'>{title}</span>
          <div className='controls'>
            <img src={'images/icon-next.svg'} onClick={prev} />
            <img src={`images/icon-${isPlaying ? 'pause' : 'play'}.svg`} onClick={() => request(`player?q=${+!isPlaying}&emit`, { method: 'PATCH' })} />
            <img src={'images/icon-next.svg'} onClick={next} />
          </div>
        </>
      }
    </div>
  )
}
