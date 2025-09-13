module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    client_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    contact_person: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    aws_account_ids: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('aws_account_ids');
        if (!value) return [];
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map(id => id.trim()).filter(id => id);
        }
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('aws_account_ids', JSON.stringify(value));
        } else {
          this.setDataValue('aws_account_ids', value);
        }
      }
    },
    gst_registered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    gst_number: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    billing_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    invoice_preferences: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'annually'),
      defaultValue: 'monthly'
    },
    default_currency: {
      type: DataTypes.ENUM('USD', 'INR'),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Client;
};