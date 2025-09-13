const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Validate file extension
const validateFileExtension = (filename, allowedExtensions) => {
  if (!filename) return false;
  const extension = path.extname(filename).toLowerCase().slice(1);
  return allowedExtensions.includes(extension);
};

// Validate file size
const validateFileSize = (fileSize, maxSizeMB = 16) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^\w\s\-_.]/g, '')
    .replace(/[-\s]+/g, '-')
    .trim();
};

// Generate unique filename
const generateUniqueFilename = (originalFilename) => {
  const extension = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, extension);
  const sanitizedBaseName = sanitizeFilename(baseName);
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0];
  
  return `${timestamp}_${uuid}_${sanitizedBaseName}${extension}`;
};

// Ensure directory exists
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// Delete file safely
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  validateFileExtension,
  validateFileSize,
  sanitizeFilename,
  generateUniqueFilename,
  ensureDirectoryExists,
  deleteFile
};