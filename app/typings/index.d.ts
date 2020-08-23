export type TSessionQueue = {
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

export type TSessionState = {
  queueId: number | null;
  queue: TSessionQueue[];
  rank: number;
}
