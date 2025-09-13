module.exports = (sequelize, DataTypes) => {
  const InvoiceLineItem = sequelize.define('InvoiceLineItem', {
    line_item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    component_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.ENUM('USD', 'INR'),
      defaultValue: 'USD'
    }
  }, {
    tableName: 'invoice_line_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Instance methods
  InvoiceLineItem.prototype.calculateAmount = function() {
    return parseFloat(this.quantity) * parseFloat(this.rate) * (1 - parseFloat(this.discount) / 100);
  };

  return InvoiceLineItem;
};