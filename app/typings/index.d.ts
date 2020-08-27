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
  duration: number;
  addedBy: string;
  uploaded: string;
  createdAt: string;
}
