const express = require('express');
const router = express.Router();
const { getMany, getOne, insert, update, deleteRecord } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/json',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// GET /api/documents - List documents with pagination
router.get('/', requireAuth, requirePermission('documents', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const documentType = req.query.document_type;
    const entityType = req.query.entity_type;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (document_name LIKE ? OR original_filename LIKE ? OR entity_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (documentType && documentType !== 'all') {
      whereClause += ' AND document_type = ?';
      params.push(documentType);
    }

    if (entityType && entityType !== 'all') {
      whereClause += ' AND entity_type = ?';
      params.push(entityType);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM documents WHERE ${whereClause}`;
    const countResult = await getOne(countQuery, params);
    const total = countResult.total;

    // Get documents with pagination
    const query = `
      SELECT d.*, u.username as uploaded_by_username
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.user_id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const documents = await getMany(query, [...params, limit, offset]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents - Upload new document
router.post('/', requireAuth, requirePermission('documents', 'create'), upload.single('file'), async (req, res) => {
  try {
    const {
      document_name,
      document_type,
      entity_type,
      entity_id,
      entity_name,
      is_public
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    if (!document_name || !document_type || !entity_type) {
      return res.status(400).json({ error: 'Document name, type, and entity type are required' });
    }

    // Prepare document data
    const documentData = {
      document_name,
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      document_type,
      entity_type,
      entity_id: entity_id ? parseInt(entity_id) : null,
      entity_name: entity_name || null,
      uploaded_by: req.user.user_id,
      is_public: is_public === 'true' || is_public === true
    };

    const documentId = await insert('documents', documentData);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'CREATE',
        entity_type: 'document',
        entity_id: documentId,
        entity_name: document_name,
        description: `Uploaded document: ${document_name}`,
        new_values: { ...documentData, file_path: '[FILE_PATH]' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: { document_id: documentId, ...documentData } }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id - Get single document
router.get('/:id', requireAuth, requirePermission('documents', 'view'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await getOne(`
      SELECT d.*, u.username as uploaded_by_username
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.user_id
      WHERE d.document_id = ?
    `, [documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id/download - Download document
router.get('/:id/download', requireAuth, requirePermission('documents', 'view'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await getOne('SELECT * FROM documents WHERE document_id = ?', [documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
    res.setHeader('Content-Type', document.mime_type);

    // Stream file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

    // Log download activity
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'DOWNLOAD',
        entity_type: 'document',
        entity_id: documentId,
        entity_name: document.document_name,
        description: `Downloaded document: ${document.document_name}`,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/documents/:id - Update document metadata
router.put('/:id', requireAuth, requirePermission('documents', 'edit'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await getOne('SELECT * FROM documents WHERE document_id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Store old values for audit
    const oldValues = { ...document };

    // Only allow updating metadata, not the file itself
    const allowedFields = ['document_name', 'document_type', 'entity_type', 'entity_id', 'entity_name', 'is_public'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await update('documents', updateData, 'document_id = ?', [documentId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'UPDATE',
        entity_type: 'document',
        entity_id: documentId,
        entity_name: document.document_name,
        description: `Updated document: ${document.document_name}`,
        old_values: oldValues,
        new_values: updateData,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: { document: { ...document, ...updateData } }
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', requireAuth, requirePermission('documents', 'delete'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await getOne('SELECT * FROM documents WHERE document_id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Delete from database
    await deleteRecord('documents', 'document_id = ?', [documentId]);

    // Log audit trail
    try {
      await auditLogger.log({
        user_id: req.user.user_id,
        action_type: 'DELETE',
        entity_type: 'document',
        entity_id: documentId,
        entity_name: document.document_name,
        description: `Deleted document: ${document.document_name}`,
        old_values: { ...document, file_path: '[FILE_PATH]' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.session?.session_id
      });
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;