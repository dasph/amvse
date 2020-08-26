import { Sequelize, DataTypes, UUIDV4 } from 'sequelize'
import { TModel, TSession, TQueue, TVideo } from '../typings/models'

const { POSTGRESQL } = process.env

const sequelize = new Sequelize(POSTGRESQL || '', { dialect: 'postgres', logging: false })
// const sequelize = new Sequelize(POSTGRESQL || '', { dialect: 'postgres' })
sequelize.authenticate().then(() => console.log('Ξ Database connected'))

export const Session = sequelize.define('session', {
  id: {
    type: new DataTypes.INTEGER(),
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4
  },
  queueId: new DataTypes.INTEGER(),
  sequence: {
    type: new DataTypes.INTEGER(),
    defaultValue: 0
  },
  isPlaying: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { updatedAt: false }) as TModel<TSession>

export const Video = sequelize.define('video', {
  id: {
    type: new DataTypes.STRING(11),
    primaryKey: true
  },
  title: {
    type: new DataTypes.STRING(64),
    allowNull: false
  },
  channel: {
    type: new DataTypes.STRING(64),
    allowNull: false
  },
  uploaded: {
    type: new DataTypes.DATEONLY(),
    allowNull: false
  },
  duration: {
    type: new DataTypes.INTEGER(),
    allowNull: false
  }
}, { updatedAt: false }) as TModel<TVideo>

export const Queue = sequelize.define('queue', {
  sessionId: {
    type: new DataTypes.INTEGER(),
    primaryKey: true
  },
  id: {
    type: new DataTypes.INTEGER(),
    primaryKey: true
  },
  videoId: {
    type: new DataTypes.STRING(11),
    allowNull: false
  },
  position: new DataTypes.INTEGER(),
  addedBy: new DataTypes.STRING(32)
}, { updatedAt: false }) as TModel<TQueue>

Session.belongsToMany(Video, { through: 'queue' })
Video.belongsToMany(Session, { through: 'queue' })

Session.afterDestroy(({ id }) => { Queue.destroy(({ where: { sessionId: id } })) })

Queue.beforeBulkCreate(async ([queue]) => {
  const [, [{ sequence }]] = await Session.update({ sequence: Sequelize.literal('sequence + 1') }, { where: { id: queue.sessionId }, returning: true })
  queue.set({ id: sequence, position: sequence })
})

// Session.sync({ force: true })
// Video.sync({ force: true })
// Queue.sync({ force: true })

