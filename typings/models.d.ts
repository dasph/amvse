import { Model, BuildOptions, BelongsToManyCreateAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyGetAssociationsMixin, BelongsToManyRemoveAssociationMixin } from 'sequelize'

export type TModel<T> = typeof Model & { new (values?: object, options?: BuildOptions): T }

export type TSession = Model & {
  readonly id: number;
  readonly uuid: string;
  queueId: number | null;
  sequence: number;
  readonly createdAt: Date;

  createVideo: BelongsToManyCreateAssociationMixin<TVideo>;
  addVideo: BelongsToManyAddAssociationMixin<TVideo, {}>;
  getVideos: BelongsToManyGetAssociationsMixin<TVideo>;
  removeVideo: BelongsToManyRemoveAssociationMixin<TVideo, {}>;
}

export type TVideo = Model & {
  readonly id: string;
  readonly title: string;
  readonly channel: string;
  readonly uploaded: Date;
  readonly duration: number;
  readonly createdAt: Date;

  readonly queue?: TQueue[];
}

export type TQueue = Model & {
  readonly sessionId: number;
  readonly id: number;
  readonly videoId: string;
  readonly position: number;
  readonly addedBy: string | null;
  readonly createdAt: Date;
}
