const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Scenario = sequelize.define(
    "Scenario",
    {
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', 
          key: 'id',
        }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      settings: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      aiSetting: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      mission: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      startingMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      imgSource: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
    }
  );
  Scenario.associate = (models) => {
    Scenario.hasMany(models.Conversation, {
      foreignKey: "scenarioId",
      as: "Conversations",
    });
  };
  return Scenario;
};
