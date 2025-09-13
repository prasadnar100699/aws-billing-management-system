const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '10.10.50.93',
  port: parseInt(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin@9955',
  database: process.env.DB_NAME || 'aws_billing_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query helper
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get single record
const getOne = async (query, params = []) => {
  const rows = await executeQuery(query, params);
  return rows[0] || null;
};

// Get multiple records
const getMany = async (query, params = []) => {
  return await executeQuery(query, params);
};

// Insert record
const insert = async (table, data) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => '?').join(', ');
  
  const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
  const result = await executeQuery(query, values);
  return result.insertId;
};

// Update record
const update = async (table, data, whereClause, whereParams = []) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  
  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const result = await executeQuery(query, [...values, ...whereParams]);
  return result.affectedRows;
};

// Delete record
const deleteRecord = async (table, whereClause, whereParams = []) => {
  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await executeQuery(query, whereParams);
  return result.affectedRows;
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  getOne,
  getMany,
  insert,
  update,
  deleteRecord
};