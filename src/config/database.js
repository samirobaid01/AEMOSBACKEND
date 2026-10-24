const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: config.server.nodeEnv === 'development',
    define: {
      freezeTableName: true,
      timestamps: false,
      sync: { alter: false, force: false },
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
