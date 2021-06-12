export type TSession = {
  rank: number;
  queueId: number | null;
  isPlaying: boolean;
}

export type TQueue = {
  id: number;
  position: number;
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  addedBy: string;
  uploaded: string;
  createdAt: string;
}

export type TQueueSearch = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  uploaded: string;
}
