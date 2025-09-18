const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '202.71.157.170',
  port: parseInt(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin@9955',
  database: process.env.DB_NAME || 'aws_billing_system_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    console.log(`   • Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   • Database: ${process.env.DB_NAME}`);
    console.log(`   • User: ${process.env.DB_USER}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL Database connection failed:', error.message);
    return false;
  }
}

// Execute query with error handling
async function executeQuery(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get single record
async function getOne(sql, params = []) {
  const results = await executeQuery(sql, params);
  return results[0] || null;
}

// Get multiple records
async function getMany(sql, params = []) {
  return await executeQuery(sql, params);
}

// Insert record
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = await executeQuery(sql, values);
  return result.insertId;
}

// Update record
async function update(table, data, condition, params = []) {
  const keys = Object.keys(data);
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  const values = Object.values(data);
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${condition}`;
  const result = await executeQuery(sql, [...values, ...params]);
  return result.affectedRows;
}

// Delete record
async function deleteRecord(table, condition, params = []) {
  const sql = `DELETE FROM ${table} WHERE ${condition}`;
  const result = await executeQuery(sql, params);
  return result.affectedRows;
}

// Get paginated results
async function getPaginated(table, options = {}) {
  const {
    page = 1,
    limit = 10,
    where = '1=1',
    whereParams = [],
    orderBy = 'created_at DESC',
    select = '*'
  } = options;

  const offset = (page - 1) * limit;

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM ${table} WHERE ${where}`;
  const countResult = await getOne(countSql, whereParams);
  const total = countResult.total;

  // Get paginated data
  const dataSql = `SELECT ${select} FROM ${table} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  const data = await getMany(dataSql, [...whereParams, limit, offset]);

  return {
    data,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      current_page: page,
      per_page: limit
    }
  };
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  getOne,
  getMany,
  insert,
  update,
  deleteRecord,
  getPaginated
};