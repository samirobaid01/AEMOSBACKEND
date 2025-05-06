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
      //  Consider using Sequelize's model generation tools to ensure your models match exactly:
      //  npx sequelize-cli model:generate --from-database
      /*
      For database-first workflows, Sequelize should be used purely as a query interface, 
      not as a schema management tool. The models should exactly mirror what's already in 
      the database.
      This approach will stop all those ALTER statements and treat your database as the 
      source of truth, which aligns with your data-first methodology.
    */
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
