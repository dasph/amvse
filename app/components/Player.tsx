import React, { useState, useEffect, lazy, useRef } from 'react'
import { TSessionQueue } from '../typings'
import { request, WebSocketClient } from '../utils'
import { YouTubePlayer } from 'youtube-player/dist/types'

import './styles/player.scss'

const YouTube = lazy(() => import('react-youtube'))

type Props = {
  ws: WebSocketClient;
  rank: number;
  queueId: number;
  queue: TSessionQueue[];
  isPlaying: boolean;
}

const createRef = <T extends unknown>(obj: T) => {
  const ref = useRef(obj)
  ref.current = obj
  return ref
}

export const Player = (props: Props) => {
  const [player, setPlayer] = useState<YouTubePlayer>()
  const [thumb, setThumb] = useState<string>('maxresdefault')
  const playerRef = createRef(player)

  const { videoId, title } = props.queue.find(({ id }) => id === props.queueId) || {}

  if (props.rank === 0) {
    props.ws.on('toggle', (state: boolean) => state ? playerRef.current.pauseVideo() : playerRef.current.playVideo())
  }

  return (
    <div className='player'>
      <span>PLAYER</span>
      {props.rank === 0 ?
        <YouTube videoId={videoId || 'lep7-tH15MY'} containerClassName='youtube-player'
          onReady={({ target }) => { setPlayer(target); if (props.isPlaying) target.playVideo() }}
          onPlay={() => request('play?q=1') }
          onPause={() => request('play?q=0') }
          onEnd={() => request('next')}
          opts={{
            host: 'https://www.youtube-nocookie.com',
            playerVars: { hl: 'en', rel: 0, modestbranding: 1, origin: location.origin }
            // playerVars: { hl: 'en', rel: 0, autoplay: 1, modestbranding: 1, ...!videoId && { loop: 1, controls: 0, mute: 1 } }
          }}
        /> :
        <>
          <div className='player-wrapper'>
            <img src={`https://i.ytimg.com/vi/${videoId || 'lep7-tH15MY'}/${thumb}.jpg`} />
          </div>
          <span>{title}</span>
          <div className='controls'>
            <img src={`images/icon-next.svg`} onClick={() => request('prev')} />
            <img src={`images/icon-${props.isPlaying ? 'pause' : 'play'}.svg`} onClick={() => request('toggle')} />
            <img src={`images/icon-next.svg`} onClick={() => request('next')} />
          </div>
        </>}
    </div>
  )
}
