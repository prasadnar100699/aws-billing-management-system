const RecurringInvoicesJob = require('./recurringInvoices');

class JobScheduler {
  static start() {
    console.log('🚀 Starting job scheduler...');
    
    // Start recurring invoices job
    RecurringInvoicesJob.start();
    
    console.log('✅ All jobs scheduled successfully');
  }
}

module.exports = JobScheduler;