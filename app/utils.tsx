const { protocol, hostname } = location

export class ApiError extends Error {
  constructor (public code: number, message?: string) { super(message) }
}

export async function request <T>(method: string, init: RequestInit = {}) {
  const { headers, ...rest } = init
  const creds = localStorage.getItem('credentials')

  const opts: RequestInit = {
    headers: {
      ...creds && { 'Authorization': `Basic ${creds}` },
      ...init.body && { 'Content-Type': 'application/json' },
      ...headers
    },
    ...init.body && { method: 'post' },
    ...rest
  }

  const res = await fetch(`${protocol}//api.${hostname}/${method}`, opts)
  if (!res.ok) throw new ApiError(res.status, await res.text())

  const { code, error, data } = await res.json()
  if (error) throw new ApiError(code, error)

  return data as T
}

export class WebSocketClient {
  private ws: WebSocket;
  private events: { [key: string]: (data) => void };

  constructor (protocols?: string | string[]) {
    const secure = protocol === 'https:'
    const creds = encodeURIComponent(localStorage.getItem('credentials'))

    this.ws = new WebSocket(`ws${secure ? 's' : ''}://ws.${hostname}/${creds}`, protocols)
    this.events = {}

    this.ws.onmessage = this.handleMessage.bind(this)
  }

  async open () {
    if (this.ws.readyState !== 0) return
    return new Promise<void>((resolve) => this.ws.onopen = () => resolve())
  }

  on <T>(type: string, cb: (payload: T) => void) {
    this.events[type] = cb
    return this
  }

  handleMessage ({ data }) {
    const { event, payload } = JSON.parse(data)

    if (this.events[event]) return this.events[event](payload)
    throw new Error(`event of type '${event}' is not mounted`)
  }
}

export const setCreds = (creds: string) => {
  localStorage.setItem('credentials', creds)
}

export const inviteHandler = async () => {
  const token = location.hash.slice(1)
  if (!token) return

  history.replaceState(null, null, ' ')
  await request<string>(`join?invite=${token}`).then(setCreds)
}
