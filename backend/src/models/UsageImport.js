module.exports = (sequelize, DataTypes) => {
  const UsageImport = sequelize.define('UsageImport', {
    import_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM('csv', 'api', 'cur'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    processed_lines: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_lines: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    errors: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_path: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    import_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'usage_imports',
    timestamps: false
  });

  return UsageImport;
};