import React, { useState, useEffect, useRef } from 'react'
import { List } from 'react-movable'
import { request, WebSocketClient } from '../utils'
import { TSessionQueue } from '../typings'

import './styles/queue.scss'

type Props = {
  ws: WebSocketClient;
  queue: TSessionQueue[];
  queueId: number;
}

const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n))
const formatTime = (t: number) => [~~(t / 60), t % 60].map((n) => `${n}`.padStart(2, '0')).join(':')

export const Queue = (props: Props) => {
  const [queue, setQueue] = useState<TSessionQueue[]>(props.queue)
  const [queueId, setQueueId] = useState<number>(props.queueId)
  const [search, setSearch] = useState<TSessionQueue[]>(null)
  const [container, setContainer] = useState<Element>(null)
  const [fetching, setFetching] = useState<boolean>(false)
  const [query, setQuery] = useState<string>('')

  const list = useRef<HTMLDivElement>()
  const input = useRef<HTMLInputElement>()

  useEffect(() => setContainer(list.current), [list.current])

  const scrollTo = (val = 0) => {
    list.current.scrollTop = val
  }

  const delQueue = (id: number) => {
    const q = queue.filter((v) => id !== v.id)
    setQueue(q)
  }

  const moveQueue = (data: any) => {
    const { id, pos } = data
    const old = queue.find((q) => id === q.id)?.position

    if (!old) return

    const sign = pos - old < 0
    const [from, to] = sign ? [pos, old] : [old, pos]

    const q = queue
      .map((q) => { if (q.position >= from && q.position <= to) q.position += sign ? 1 : -1; return q })
      .map((q) => { if (q.id === id) q.position = pos; return q })
      .sort(({ position: a }, { position: b }) => a - b)

    setQueue(q)
  }

  const getQueue = async (query: string, page?: string) => {
    setFetching(true)
    const res = await request(`search?query=${query}${page ? `&page=${page}` : ''}`)
    setFetching(false)
    return res
  }

  const addQueue = async (payload: TSessionQueue) => {
    setQueue([...queue, payload])
  }

  const onQuery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)

    const { value: query } = input.current
    const check = async (data: any) => input.current.value === query ? data : Promise.reject()

    if (query.length < 2) {
      setSearch(null)
      setFetching(false)
      return scrollTo()
    }

    wait(500).then(check)
      .then(() => getQueue(query))
      .then(check)
      .then((search) => {
        setSearch(search)
        scrollTo()
      }).catch(() => {})
  }

  props.ws
    .on('addQueue', addQueue)
    .on('delQueue', delQueue)
    .on('moveQueue', moveQueue)
    .on('setQueueId', setQueueId)

  return (
    <div className='queue'>
      <span>{search ? 'SEARCH' : 'QUEUE'}</span>

      <div className={`fetch${fetching ? '' : ' hidden'}`} />

      <div className='queue-list' ref={list}>
        {!search ?
          <List
            values={queue}
            lockVertically={true}
            container={container}
            onChange={({ oldIndex, newIndex }) => {
              request(`queue?id=${queue[oldIndex].id}&pos=${newIndex + 1}`, { method: 'PATCH' })
            }}
            renderList={({ children, props }) => <div className='queue-list-list' {...props}>{children}</div>}
            renderItem={({ value: { id, videoId, title, channel, duration }, props }) => (
              <div className={`queue-song`} {...props} key={id}>
                {id === queueId && <div className='queue-playing' /> }
                <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} loading='lazy' width='100px' height='56px' />
                <div className='queue-song-info' data-movable-handle>
                  <span>{title}</span>
                  <span>{channel}</span>
                </div>
                <div className='queue-song-right'>
                  {!search && <img className='queue-remove' onClick={() => request(`queue?id=${id}`, { method: 'DELETE' })} />}
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
          /> :
          <div className='queue-list-list'> {
            search.map(({ id, title, channel, duration }) =>
              <div className={`queue-song`} key={id} onClick={() => request(`queue?id=${id}`, { method: 'PUT' })}>
                <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} loading='lazy' width='100px' height='56px' />
                <div className='queue-song-info'>
                  <span>{title}</span>
                  <span>{channel}</span>
                </div>
                <div className='queue-song-right'>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}</div>}
      </div>

      <div className='queue-add'>
        <input
          type='text' value={query} onChange={onQuery}
          placeholder='Search for Music' autoCapitalize='false' ref={input}
          autoCorrect='false' spellCheck='false' maxLength={32}
        />

        <img
          className={`${query ? 'icon-clear' : 'icon-search'}`}
          onClick={query ? () => { setQuery(''); setSearch(null) } : null}
        />
      </div>
    </div>
  )
}




  // onScroll ({ target }) {
  //   const { scrollTop: x, scrollHeight: a, offsetHeight: b } = target

  //   if (this.state.search && (x / a + b / a > 0.8) && !this.state.fetching) {
  //     const { value: query } = this.input.current
  //     const { length: offset } = this.state.search

  //     if (offset > 75) return

  //     this.search(query, offset).then((res: any) => {
  //       const search = res.filter((a) => !this.state.search.find((o) => o.id === a.id))

  //       this.setState({ search: [...this.state.search, ...search] })
  //     })
  //   }
  // }

  // addToQueue (ids) {
  //   return new Promise((resolve) => request('info', {
  //     body: JSON.stringify(ids.map(({ id }) => id))
  //   }).then((data) => {
  //     const q = ids.map((s) => ({ ...s, ...data[s.id] }))
  //     this.setState({ queue: [...this.state.queue, ...q] }, resolve)
  //   }))
  // }

  // onAddToQueue (id) {
  //   const search = this.state.search.filter((e) => id !== e.id)

  //   this.setState({ search })

  //   // return this.props.ws.sendUpdate('addToQueue', id)
  // }
