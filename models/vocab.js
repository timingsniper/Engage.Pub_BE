const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Vocab = sequelize.define(
    "Vocab",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', 
          key: 'id',
        }
      },
      scenarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Scenarios', 
          key: 'id',
        }
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      translation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
    }
  );

  Vocab.associate = (models) => {
    Vocab.belongsTo(models.Scenario, {
      foreignKey: "scenarioId",
      as: "Scenario",
    });
  };

  return Vocab;
};
