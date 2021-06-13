import { IMiddleware } from 'koa-router'

export { RouterContext } from 'koa-router'

export { IMiddleware }

export type TAuthorizedMiddleware = IMiddleware<TCredentials & { data: unknown }>

export type TCredentials = {
  session: string;
  rank: number;
  signed: number;
}

export type TInvite = {
  session: string;
  signed: number;
}

type YoutubeSearchItem = {
  id: string;
  title: string;
  uploadedAt: string;
  views: number;
  duration: string;
  author: string;
}

export type YoutubeSearchResult = {
  code: number;
  data: YoutubeSearchItem[];
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
