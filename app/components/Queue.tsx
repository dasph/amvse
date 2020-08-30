import React, { useState, useEffect, useRef } from 'react'
import { List } from 'react-movable'
import { request } from '../utils'
import { TQueue, TQueueSearch } from '../typings'

import './styles/queue.scss'

type Props = {
  queue: TQueue[];
  queueId: number;
}

const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n))
const format = (t: number) => [~~(t / 60), t % 60].map((n) => `${n}`.padStart(2, '0')).join(':')

export const Queue = ({ queue, queueId }: Props) => {
  const [search, setSearch] = useState<TQueueSearch[]>(null)
  const [container, setContainer] = useState<Element>(null)
  const [fetching, setFetching] = useState<boolean>(false)
  const [query, setQuery] = useState<string>('')

  const list = useRef<HTMLDivElement>()
  const input = useRef<HTMLInputElement>()

  useEffect(() => setContainer(list.current), [list.current])

  const scrollTo = (val = 0) => {
    list.current.scrollTop = val
  }

  const getQueue = async (query: string, page?: string) => {
    if (query.length < 3) return

    setFetching(true)
    const res = await request(`search?query=${query}${page ? `&page=${page}` : ''}`)
    setFetching(false)
    return res
  }

  const delQueue = (id: number) => {
    request(`queue?id=${id}`, { method: 'DELETE' })

    if (queueId === id && queue.length > 1) {
      const i = queue.findIndex(({ id }) => id === queueId) + 1
      request(`queue?id=${i < queue.length ? queue[i].id : queue[0].id}`, { method: 'POST' })
    }
  }

  const onQuery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)

    const { value: query } = input.current
    const check = async (data: TQueueSearch[]) => input.current.value === query ? data : Promise.reject()

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
      }).catch(() => void 0)
  }

  return (
    <div className='queue' ref={list}>
      <span>{search ? 'SEARCH' : 'QUEUE'}</span>

      {!search ? queue.length ?
        <List
          values={queue}
          lockVertically={true}
          container={container}
          onChange={({ oldIndex, newIndex }) => {
            request(`queue?id=${queue[oldIndex].id}&pos=${queue[newIndex].position}`, { method: 'PATCH' })
          }}
          renderList={({ children, props }) => <div className='list' {...props}>{children}</div>}
          renderItem={({ value: { id, videoId, title, channel, duration }, props, isDragged }) => (
            <div className={`song${isDragged ? ' dragged' : ''}${id === queueId ? ' invert' : ''}`} {...props} key={id}>
              <div className='thumbnail' onClick={() => request(`queue?id=${id}`, { method: 'POST' }) }>
                <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} loading='lazy' width='100px' height='56px' />
                <img src='images/icon-start.svg' width='40px' height='40px' />
              </div>
              <div className='info'>
                <span>{title}</span>
                <span>{channel}</span>
              </div>
              <div className='move' data-movable-handle>
                <img src='images/icon-move.svg' width='4px' height='48px' />
              </div>
              <div className='right'>
                <img src='images/icon-remove.svg' width='24px' height='24px' onClick={() => delQueue(id)} />
                <span>{format(duration)}</span>
              </div>
            </div>
          )}
        /> :
        <div className='list'>
          <div className='empty'>
            <img src='images/icon-emptyqueue.svg' width='256x' height='256px' />
            <span>{`it's lonely out here...`}</span>
          </div>
        </div> :
        <div className='list'> {
          search.map(({ id, title, channel, duration, uploaded }) =>
            <div className={`song search${queue.find((q) => q.videoId === id) ? ' added' : ''}`} key={id} onClick={() => request(`queue?id=${id}`, { method: 'PUT' })}>
              <div className='thumbnail'>
                <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} loading='lazy' width='100px' height='56px' />
                <img src='images/icon-add.svg' width='40px' height='40px' />
              </div>
              <div className='info'>
                <span>{title}</span>
                <span>{channel}</span>
              </div>
              <div className='right'>
                <span>{format(duration)}</span>
                <span>{new Date(uploaded).toLocaleDateString().replace(/\/(?=\d{3})/, '\n')}</span>
              </div>
            </div>
          )}
        </div>
      }

      <div className={`fetch${fetching ? '' : ' hidden'}`} />

      <div className='add'>
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
