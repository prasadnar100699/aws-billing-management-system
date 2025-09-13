module.exports = (sequelize, DataTypes) => {
  const PricingComponent = sequelize.define('PricingComponent', {
    component_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    component_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    metric_type: {
      type: DataTypes.ENUM('usage', 'request', 'data_transfer', 'hour', 'gb', 'fixed'),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1
    },
    billing_method: {
      type: DataTypes.ENUM('per_unit', 'per_hour', 'monthly', 'tiered'),
      defaultValue: 'per_unit'
    },
    currency: {
      type: DataTypes.ENUM('USD', 'INR'),
      defaultValue: 'USD'
    },
    tier_rules: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('tier_rules');
        if (!value) return {};
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      },
      set(value) {
        if (typeof value === 'object') {
          this.setDataValue('tier_rules', JSON.stringify(value));
        } else {
          this.setDataValue('tier_rules', value);
        }
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'pricing_components',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PricingComponent;
};