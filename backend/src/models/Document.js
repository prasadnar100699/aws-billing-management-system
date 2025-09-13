module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    document_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    document_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    upload_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    type: {
      type: DataTypes.ENUM('invoice', 'receipt', 'contract', 'report', 'other'),
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    file_path: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'documents',
    timestamps: false
  });

  return Document;
};