module.exports = (sequelize, DataTypes) => {
  const InvoiceTemplate = sequelize.define('InvoiceTemplate', {
    template_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    services: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('services');
        if (!value) return [];
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('services', JSON.stringify(value));
        } else {
          this.setDataValue('services', value);
        }
      }
    },
    frequency: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'annually'),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'invoice_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return InvoiceTemplate;
};