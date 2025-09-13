module.exports = (sequelize, DataTypes) => {
  const ClientAwsMapping = sequelize.define('ClientAwsMapping', {
    mapping_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    aws_account_id: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    billing_tag_key: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    billing_tag_value: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'client_aws_mappings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return ClientAwsMapping;
};