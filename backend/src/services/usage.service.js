const csv = require('fast-csv');
const fs = require('fs');
const { UsageImport, Client, Service, PricingComponent, Invoice, InvoiceLineItem } = require('../models');
const AuditService = require('./audit.service');

class UsageService {
  async processUsageImport(importId) {
    try {
      const usageImport = await UsageImport.findByPk(importId, {
        include: [{ model: Client, as: 'client' }]
      });

      if (!usageImport) {
        throw new Error('Usage import not found');
      }

      // Update status to processing
      await usageImport.update({ status: 'processing' });

      const results = [];
      const errors = [];

      return new Promise((resolve, reject) => {
        fs.createReadStream(usageImport.file_path)
          .pipe(csv.parse({ headers: true }))
          .on('data', (row) => {
            try {
              // Validate required columns
              if (!row.ServiceCode || !row.UsageType || !row.Cost) {
                errors.push(`Missing required columns in row: ${JSON.stringify(row)}`);
                return;
              }

              // Process the row
              const processedRow = {
                aws_account_id: row.AccountId || row.LinkedAccountId,
                service_code: row.ServiceCode,
                usage_type: row.UsageType,
                operation: row.Operation,
                resource_id: row.ResourceId,
                usage_quantity: parseFloat(row.UsageQuantity) || 0,
                unit: row.Unit,
                unblended_cost: parseFloat(row.UnblendedCost) || parseFloat(row.Cost) || 0,
                blended_cost: parseFloat(row.BlendedCost) || parseFloat(row.Cost) || 0,
                usage_start_date: row.UsageStartDate,
                usage_end_date: row.UsageEndDate
              };

              results.push(processedRow);
            } catch (error) {
              errors.push(`Error processing row: ${error.message}`);
            }
          })
          .on('end', async () => {
            try {
              // Update import statistics
              await usageImport.update({
                total_lines: results.length + errors.length,
                processed_lines: results.length,
                status: errors.length > 0 ? 'completed' : 'completed',
                errors: errors.length > 0 ? errors.join('\n') : null,
                processed_at: new Date()
              });

              // Generate invoice from usage data if successful
              if (results.length > 0 && errors.length === 0) {
                await this.generateInvoiceFromUsage(usageImport, results);
              }

              resolve({
                processed: results.length,
                errors: errors.length,
                totalLines: results.length + errors.length
              });
            } catch (error) {
              await usageImport.update({
                status: 'failed',
                errors: error.message
              });
              reject(error);
            }
          })
          .on('error', async (error) => {
            await usageImport.update({
              status: 'failed',
              errors: error.message
            });
            reject(error);
          });
      });
    } catch (error) {
      throw new Error(`Usage import processing failed: ${error.message}`);
    }
  }

  async generateInvoiceFromUsage(usageImport, usageData) {
    try {
      // Create invoice
      const invoice = await Invoice.create({
        client_id: usageImport.client_id,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        billing_period_start: usageImport.billing_period_start,
        billing_period_end: usageImport.billing_period_end,
        gst_applicable: usageImport.client.gst_registered,
        status: 'draft'
      });

      await invoice.generateInvoiceNumber();
      await invoice.save();

      // Group usage data by service
      const serviceGroups = {};
      usageData.forEach(usage => {
        const key = `${usage.service_code}_${usage.usage_type}`;
        if (!serviceGroups[key]) {
          serviceGroups[key] = {
            service_code: usage.service_code,
            usage_type: usage.usage_type,
            total_cost: 0,
            total_quantity: 0,
            unit: usage.unit
          };
        }
        serviceGroups[key].total_cost += usage.unblended_cost;
        serviceGroups[key].total_quantity += usage.usage_quantity;
      });

      // Create line items
      for (const group of Object.values(serviceGroups)) {
        // Try to find matching service and pricing component
        const service = await Service.findOne({
          where: { aws_service_code: group.service_code }
        });

        let componentId = null;
        let rate = group.total_quantity > 0 ? group.total_cost / group.total_quantity : group.total_cost;

        if (service) {
          const component = await PricingComponent.findOne({
            where: { service_id: service.service_id }
          });
          if (component) {
            componentId = component.component_id;
            rate = parseFloat(component.rate);
          }
        }

        await InvoiceLineItem.create({
          invoice_id: invoice.invoice_id,
          component_id: componentId,
          description: `${group.service_code} - ${group.usage_type}`,
          quantity: group.total_quantity || 1,
          rate: rate,
          currency: usageImport.client.default_currency
        });
      }

      await AuditService.logUserAction(
        null,
        'generate_invoice_from_usage',
        `Generated invoice ${invoice.invoice_number} from usage import ${usageImport.import_id}`
      );

      return invoice;
    } catch (error) {
      throw new Error(`Invoice generation from usage failed: ${error.message}`);
    }
  }

  async validateUsageFile(filePath) {
    try {
      const requiredColumns = ['ServiceCode', 'UsageType', 'Cost'];
      let hasValidHeaders = false;

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv.parse({ headers: true, maxRows: 1 }))
          .on('headers', (headers) => {
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            if (missingColumns.length === 0) {
              hasValidHeaders = true;
            } else {
              reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            }
          })
          .on('end', () => {
            if (hasValidHeaders) {
              resolve(true);
            } else {
              reject(new Error('Invalid CSV format'));
            }
          })
          .on('error', reject);
      });
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }
}

module.exports = new UsageService();