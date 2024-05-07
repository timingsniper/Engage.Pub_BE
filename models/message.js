const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define("Message", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users', 
        key: 'id',
      },
      allowNull: false
    },
    scenarioId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('system', 'assistant', 'user'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    translation: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    charset: "utf8",
    collate: "utf8_general_ci",
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Scenario, {
      foreignKey: "scenarioId",
      as: "Scenario",
    });
  };

  return Message;
};
