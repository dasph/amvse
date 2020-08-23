import { IMiddleware } from 'koa-router'

export { RouterContext } from 'koa-router'

export { IMiddleware }

export type TAuthorizedMiddleware = IMiddleware<TCredentials & { data: any }>

export type TCredentials = {
  session: string;
  rank: number;
  signed: number;
}

export type TInvite = {
  session: string;
  signed: number;
}

export type TKoaError = {
  errno: number;
  code: string;
  syscall: string;
  headerSent: boolean;
}

type YoutubeSearchItem = {
  id: {
    videoId: string;
  }
  snippet: {
    publishedAt: string;
    title: string;
    channelTitle: string;
  }
}

export type YoutubeSearchResult = {
  nextPageToken?: string;
  items: YoutubeSearchItem[];
}

type YoutubeVideoItem = {
  id: string;
  contentDetails: {
    duration: string;
  }
}

export type YoutubeVideoResult = {
  items: YoutubeVideoItem[];
}
