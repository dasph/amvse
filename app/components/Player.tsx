import React, { useState } from 'react'
import YouTube from 'react-youtube'
import { YouTubePlayer } from 'youtube-player/dist/types'
import { TSessionQueue } from '../typings'
import { request, WebSocketClient } from '../utils'

import './styles/player.scss'

type Props = {
  ws: WebSocketClient;
  videoId: string;
  queue: TSessionQueue[];
}

export default function Player (props: Props) {
  const [videoId, setVideoId] = useState<string>(props.videoId)
  const [player, setPlayer] = useState<YouTubePlayer>()

  const defaultVideo = 'lep7-tH15MY'

  props.ws
    .on('setVideoId', setVideoId)

  return (
    <div className='player'>
      <span>PLAYER</span>
      <YouTube videoId={videoId || defaultVideo} containerClassName='youtube-player'
        onReady={({ target }) => setPlayer(target)}
        onEnd={() => request('next')}
        opts={{
          host: 'https://www.youtube-nocookie.com',
          playerVars: { hl: 'en', rel: 0, autoplay: 1, modestbranding: 1, ...!videoId && { loop: 1, controls: 0, mute: 1 } }
        }}
      />
    </div>
  )
}
