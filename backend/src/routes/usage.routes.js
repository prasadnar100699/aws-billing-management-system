const express = require('express');
const router = express.Router();
const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/usage');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for usage files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// GET /api/usage - List usage imports with pagination
router.get('/', requireAuth, requirePermission('usage_import', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status;
    const clientId = req.query.client_id;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (ui.file_name LIKE ? OR c.client_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== 'all') {
      whereClause += ' AND ui.status = ?';
      params.push(status);
    }

    if (clientId && clientId !== 'all') {
      whereClause += ' AND ui.client_id = ?';
      params.push(clientId);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM aws_usage_imports ui 
      JOIN clients c ON ui.client_id = c.client_id 
      WHERE ${whereClause}
    `;
    const countResult = await getOne(countQuery, params);
    const total = countResult.total;

    // Get usage imports with client info
    const query = `
      SELECT ui.*, c.client_name, u.username as imported_by_username
      FROM aws_usage_imports ui
      JOIN clients c ON ui.client_id = c.client_id
      LEFT JOIN users u ON ui.imported_by = u.user_id
      WHERE ${whereClause}
      ORDER BY ui.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const imports = await getMany(query, [...params, limit, offset]);

    // Parse aws_account_ids JSON for each import
    const processedImports = imports.map(importItem => ({
      ...importItem,
      aws_account_ids: importItem.aws_account_ids ? JSON.parse(importItem.aws_account_ids || '[]') : []
    }));

    res.json({
      success: true,
      data: processedImports,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('List usage imports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/usage/import - Start new usage import
router.post('/import', requireAuth, requirePermission('usage_import', 'create'), upload.single('file'), async (req, res) => {
  try {
    const {
      client_id,
      import_source,
      billing_period_start,
      billing_period_end
    } = req.body;

    if (!client_id || !import_source || !billing_period_start || !billing_period_end) {
      return res.status(400).json({ error: 'Client, import source, and billing period are required' });
    }

    // Validate client exists
    const client = await getOne('SELECT * FROM clients WHERE client_id = ?', [client_id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // For CSV imports, file is required
    if (import_source === 'CSV' && !req.file) {
      return res.status(400).json({ error: 'CSV file is required for CSV imports' });
    }

    // Create usage import record
    const importData = {
      client_id: parseInt(client_id),
      import_source,
      file_name: req.file ? req.file.originalname : null,
      file_path: req.file ? req.file.path : null,
      aws_account_ids: client.aws_account_ids || '[]',
      billing_period_start: new Date(billing_period_start),
      billing_period_end: new Date(billing_period_end),
      status: 'pending',
      imported_by: req.user.user_id
    };

    const importId = await insert('aws_usage_imports', importData);

    // If CSV file, start processing
    if (import_source === 'CSV' && req.file) {
      // Start background processing (in a real app, use a job queue)
      processUsageFile(importId, req.file.path);
    }

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'CREATE',
        entity_type: 'usage_import',
        entity_id: importId,
        entity_name: `Import for ${client.client_name}`,
        description: `Started usage import for ${client.client_name}`,
        new_values: { ...importData, file_path: '[FILE_PATH]' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Usage import started successfully',
      data: { import: { import_id: importId, ...importData } }
    });
  } catch (error) {
    console.error('Start usage import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/usage/:id - Get single usage import
router.get('/:id', requireAuth, requirePermission('usage_import', 'view'), async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    
    const usageImport = await getOne(`
      SELECT ui.*, c.client_name, u.username as imported_by_username
      FROM aws_usage_imports ui
      JOIN clients c ON ui.client_id = c.client_id
      LEFT JOIN users u ON ui.imported_by = u.user_id
      WHERE ui.import_id = ?
    `, [importId]);

    if (!usageImport) {
      return res.status(404).json({ error: 'Usage import not found' });
    }

    // Parse aws_account_ids JSON
    usageImport.aws_account_ids = usageImport.aws_account_ids ? JSON.parse(usageImport.aws_account_ids) : [];

    // Get usage records for this import
    const usageRecords = await getMany(
      'SELECT * FROM aws_usage_records WHERE import_id = ? ORDER BY usage_date DESC LIMIT 100',
      [importId]
    );

    res.json({
      success: true,
      data: {
        import: usageImport,
        usage_records: usageRecords
      }
    });
  } catch (error) {
    console.error('Get usage import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/usage/:id - Delete usage import
router.delete('/:id', requireAuth, requirePermission('usage_import', 'delete'), async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    
    const usageImport = await getOne('SELECT * FROM aws_usage_imports WHERE import_id = ?', [importId]);
    if (!usageImport) {
      return res.status(404).json({ error: 'Usage import not found' });
    }

    // Only allow deletion if not completed
    if (usageImport.status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete completed imports' });
    }

    // Delete usage records first
    await deleteRecord('aws_usage_records', 'import_id = ?', [importId]);

    // Delete file from disk if exists
    if (usageImport.file_path && fs.existsSync(usageImport.file_path)) {
      fs.unlinkSync(usageImport.file_path);
    }

    // Delete import record
    await deleteRecord('aws_usage_imports', 'import_id = ?', [importId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'DELETE',
        entity_type: 'usage_import',
        entity_id: importId,
        entity_name: usageImport.file_name || 'Usage Import',
        description: `Deleted usage import: ${usageImport.file_name || importId}`,
        old_values: { ...usageImport, file_path: '[FILE_PATH]' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Usage import deleted successfully'
    });
  } catch (error) {
    console.error('Delete usage import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Background function to process usage file
async function processUsageFile(importId, filePath) {
  try {
    // Update status to processing
    await update('aws_usage_imports', { status: 'processing' }, 'import_id = ?', [importId]);

    const usageRecords = [];
    let totalRecords = 0;
    let processedRecords = 0;
    let failedRecords = 0;

    // Read and parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        totalRecords++;
        try {
          // Validate required columns
          if (!row.UsageType || !row.Cost || !row.UsageQuantity) {
            failedRecords++;
            return;
          }

          usageRecords.push({
            import_id: importId,
            aws_account_id: row.LinkedAccountId || '',
            service_code: row.ServiceCode || '',
            usage_type: row.UsageType,
            operation: row.Operation || '',
            resource_id: row.ResourceId || '',
            usage_start_date: row.UsageStartDate ? new Date(row.UsageStartDate) : null,
            usage_end_date: row.UsageEndDate ? new Date(row.UsageEndDate) : null,
            usage_quantity: parseFloat(row.UsageQuantity) || 0,
            rate: parseFloat(row.Rate) || 0,
            cost: parseFloat(row.Cost) || 0,
            currency: row.Currency || 'USD',
            region: row.Region || '',
            availability_zone: row.AvailabilityZone || ''
          });
          processedRecords++;
        } catch (error) {
          failedRecords++;
        }
      })
      .on('end', async () => {
        try {
          // Insert usage records in batches
          for (let i = 0; i < usageRecords.length; i += 100) {
            const batch = usageRecords.slice(i, i + 100);
            for (const record of batch) {
              await insert('aws_usage_records', record);
            }
          }

          // Update import status
          await update('aws_usage_imports', {
            status: 'completed',
            total_records: totalRecords,
            processed_records: processedRecords,
            failed_records: failedRecords,
            completed_at: new Date()
          }, 'import_id = ?', [importId]);

        } catch (error) {
          console.error('Processing error:', error);
          await update('aws_usage_imports', {
            status: 'failed',
            total_records: totalRecords,
            processed_records: processedRecords,
            failed_records: failedRecords,
            error_log: error.message
          }, 'import_id = ?', [importId]);
        }
      })
      .on('error', async (error) => {
        console.error('CSV parsing error:', error);
        await update('aws_usage_imports', {
          status: 'failed',
          error_log: error.message
        }, 'import_id = ?', [importId]);
      });

  } catch (error) {
    console.error('Process usage file error:', error);
    await update('aws_usage_imports', {
      status: 'failed',
      error_log: error.message
    }, 'import_id = ?', [importId]);
  }
}

module.exports = router;