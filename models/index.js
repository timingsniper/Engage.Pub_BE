const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

// Table Initialization
db.User = require('./user')(sequelize, Sequelize);
db.Conversation = require('./conversation')(sequelize, Sequelize);
db.Scenario = require('./scenario')(sequelize, Sequelize);
db.Message = require('./message')(sequelize, Sequelize);
db.SharedConversation = require('./sharedConversation')(sequelize, Sequelize);

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
