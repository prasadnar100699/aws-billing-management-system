-- AWS Billing Management System Database Schema
-- MySQL 8.x Compatible

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS aws_billing_system;
USE aws_billing_system;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Role module access permissions
CREATE TABLE IF NOT EXISTS role_module_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    module_name VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_module (role_id, module_name)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action)
);

-- Service categories table
CREATE TABLE IF NOT EXISTS service_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_category_id INT NOT NULL,
    aws_service_code VARCHAR(50),
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_category_id) REFERENCES service_categories(category_id),
    INDEX idx_aws_service_code (aws_service_code),
    INDEX idx_status (status)
);

-- Pricing components table
CREATE TABLE IF NOT EXISTS pricing_components (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    metric_type ENUM('usage', 'request', 'data_transfer', 'hour', 'gb', 'fixed') NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    billing_method ENUM('per_unit', 'per_hour', 'monthly', 'tiered') DEFAULT 'per_unit',
    currency ENUM('USD', 'INR') DEFAULT 'USD',
    tier_rules TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    INDEX idx_service_id (service_id),
    INDEX idx_status (status)
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    aws_account_ids TEXT,
    gst_registered BOOLEAN DEFAULT FALSE,
    gst_number VARCHAR(15),
    billing_address TEXT,
    invoice_preferences ENUM('monthly', 'quarterly', 'annually') DEFAULT 'monthly',
    default_currency ENUM('USD', 'INR') DEFAULT 'USD',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_gst_number (gst_number)
);

-- User-Client mappings (for Client Managers)
CREATE TABLE IF NOT EXISTS user_client_mappings (
    user_id INT NOT NULL,
    client_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, client_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);

-- Client AWS mappings
CREATE TABLE IF NOT EXISTS client_aws_mappings (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    aws_account_id VARCHAR(12) NOT NULL,
    billing_tag_key VARCHAR(50),
    billing_tag_value VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    INDEX idx_aws_account_id (aws_account_id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    usd_to_inr_rate DECIMAL(8,4),
    gst_applicable BOOLEAN DEFAULT FALSE,
    invoice_notes TEXT,
    status ENUM('draft', 'approved', 'finalized', 'sent') DEFAULT 'draft',
    pdf_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    INDEX idx_client_id (client_id),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date)
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    line_item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    component_id INT,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    currency ENUM('USD', 'INR') DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES pricing_components(component_id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_component_id (component_id)
);

-- Invoice attachments table
CREATE TABLE IF NOT EXISTS invoice_attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(100) NOT NULL,
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id)
);

-- Invoice templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    services TEXT,
    frequency ENUM('monthly', 'quarterly', 'annually') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_is_active (is_active)
);

-- Usage imports table
CREATE TABLE IF NOT EXISTS usage_imports (
    import_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    source ENUM('csv', 'api', 'cur') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    processed_lines INT DEFAULT 0,
    total_lines INT DEFAULT 0,
    errors TEXT,
    file_path VARCHAR(255),
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    INDEX idx_client_id (client_id),
    INDEX idx_status (status),
    INDEX idx_import_date (import_date)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type ENUM('invoice', 'receipt', 'contract', 'report', 'other') NOT NULL,
    size INT,
    file_path VARCHAR(255) NOT NULL,
    client_id INT,
    invoice_id INT,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_client_id (client_id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_type (type),
    INDEX idx_upload_date (upload_date)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    client_id INT,
    type ENUM('email', 'sms', 'in_app') NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    retry_count INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    INDEX idx_user_id (user_id),
    INDEX idx_client_id (client_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);