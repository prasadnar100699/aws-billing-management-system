const cron = require('node-cron');
const { InvoiceTemplate, Client, Invoice, InvoiceLineItem, PricingComponent } = require('../models');
const AuditService = require('../services/audit.service');

class RecurringInvoicesJob {
  constructor() {
    this.isRunning = false;
  }

  // Run every day at 9:00 AM
  start() {
    cron.schedule('0 9 * * *', async () => {
      if (this.isRunning) {
        console.log('Recurring invoices job already running, skipping...');
        return;
      }

      console.log('🔄 Starting recurring invoices job...');
      await this.processRecurringInvoices();
    });

    console.log('📅 Recurring invoices job scheduled (daily at 9:00 AM)');
  }

  async processRecurringInvoices() {
    this.isRunning = true;
    
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Find active templates that need processing
      const templates = await InvoiceTemplate.findAll({
        where: { is_active: true },
        include: [{ model: Client, as: 'client' }]
      });

      let processedCount = 0;

      for (const template of templates) {
        try {
          // Check if invoice should be generated based on frequency
          const shouldGenerate = await this.shouldGenerateInvoice(template, today);
          
          if (shouldGenerate) {
            await this.generateInvoiceFromTemplate(template);
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing template ${template.template_id}:`, error);
          await AuditService.logUserAction(
            null,
            'recurring_invoice_error',
            `Error processing template ${template.template_name}: ${error.message}`
          );
        }
      }

      console.log(`✅ Recurring invoices job completed. Generated ${processedCount} invoices.`);
      
      await AuditService.logUserAction(
        null,
        'recurring_invoices_processed',
        `Processed ${templates.length} templates, generated ${processedCount} invoices`
      );

    } catch (error) {
      console.error('Recurring invoices job error:', error);
      await AuditService.logUserAction(
        null,
        'recurring_invoices_error',
        `Recurring invoices job failed: ${error.message}`
      );
    } finally {
      this.isRunning = false;
    }
  }

  async shouldGenerateInvoice(template, today) {
    const lastInvoice = await Invoice.findOne({
      where: { client_id: template.client_id },
      order: [['created_at', 'DESC']]
    });

    if (!lastInvoice) {
      return true; // First invoice
    }

    const lastInvoiceDate = new Date(lastInvoice.created_at);
    const daysSinceLastInvoice = Math.floor((today - lastInvoiceDate) / (1000 * 60 * 60 * 24));

    switch (template.frequency) {
      case 'monthly':
        return daysSinceLastInvoice >= 30;
      case 'quarterly':
        return daysSinceLastInvoice >= 90;
      case 'annually':
        return daysSinceLastInvoice >= 365;
      default:
        return false;
    }
  }

  async generateInvoiceFromTemplate(template) {
    // Create invoice
    const invoice = await Invoice.create({
      client_id: template.client_id,
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      gst_applicable: template.client.gst_registered,
      status: 'draft',
      invoice_notes: `Generated from template: ${template.template_name}`
    });

    await invoice.generateInvoiceNumber();
    await invoice.save();

    // Add line items from template services
    const services = template.services || [];
    for (const serviceData of services) {
      const component = await PricingComponent.findByPk(serviceData.component_id);
      if (component) {
        await InvoiceLineItem.create({
          invoice_id: invoice.invoice_id,
          component_id: component.component_id,
          description: serviceData.description || component.component_name,
          quantity: serviceData.quantity || 1,
          rate: serviceData.rate || component.rate,
          currency: template.client.default_currency
        });
      }
    }

    console.log(`📄 Generated recurring invoice: ${invoice.invoice_number} for ${template.client.client_name}`);
    
    return invoice;
  }
}

module.exports = new RecurringInvoicesJob();