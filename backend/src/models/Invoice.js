module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
    invoice_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    invoice_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usd_to_inr_rate: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: true
    },
    gst_applicable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    invoice_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'approved', 'finalized', 'sent'),
      defaultValue: 'draft'
    },
    pdf_path: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods
  Invoice.prototype.generateInvoiceNumber = async function() {
    if (this.invoice_number) return;

    const date = new Date();
    const yearMonth = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the next sequence number for this client and month
    const lastInvoice = await Invoice.findOne({
      where: {
        client_id: this.client_id,
        invoice_number: {
          [sequelize.Sequelize.Op.like]: `TejIT-${this.client_id.toString().padStart(3, '0')}-${yearMonth}-%`
        }
      },
      order: [['invoice_number', 'DESC']]
    });

    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoice_number.split('-');
      sequence = parseInt(parts[parts.length - 1]) + 1;
    }

    this.invoice_number = `TejIT-${this.client_id.toString().padStart(3, '0')}-${yearMonth}-${sequence.toString().padStart(3, '0')}`;
  };

  Invoice.prototype.calculateTotals = async function() {
    const lineItems = await this.getLineItems();
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.rate) * (1 - parseFloat(item.discount) / 100));
    }, 0);
    
    const gstAmount = this.gst_applicable ? subtotal * 0.18 : 0;
    const total = subtotal + gstAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      gst_amount: parseFloat(gstAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  };

  return Invoice;
};