import { IncomingMessage } from 'http'
import { request, RequestOptions } from 'https'

export const digest = (stream: IncomingMessage) => {
  return new Promise<Buffer>((resolve, reject) => {
    const data: Array<Buffer> = []
    stream.on('data', (chunk) => data.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(data)))
    stream.on('error', reject)
  })
}

export const serve = <T>(stream: IncomingMessage) => ({
  get stream () { return stream },
  get buffer () { return digest(stream) },
  get body () { return digest(stream).then((b) => b.toString()) },
  get json () { return this.body.then<T>(JSON.parse) }
})

export const fetch = async <T>(options: string | RequestOptions) => {
  return new Promise<IncomingMessage>((resolve, reject) => request(options, resolve).on('error', reject).end()).then((s) => serve<T>(s))
}
