-- AWS Billing Management System Database Schema
-- MySQL 8.x

CREATE DATABASE IF NOT EXISTS aws_billing_system;
USE aws_billing_system;

-- Roles table
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Role module access permissions
CREATE TABLE role_module_access (
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
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Audit logs table
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
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
CREATE TABLE service_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE services (
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
CREATE TABLE pricing_components (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    metric_type ENUM('HOUR', 'GB', 'REQUEST', 'FIXED') NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    billing_method ENUM('per_unit', 'tiered', 'flat') DEFAULT 'per_unit',
    currency ENUM('USD', 'INR') DEFAULT 'USD',
    tier_rules JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    INDEX idx_service_id (service_id),
    INDEX idx_status (status)
);

-- Clients table
CREATE TABLE clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    aws_account_ids TEXT,
    gst_registered BOOLEAN DEFAULT FALSE,
    gst_number VARCHAR(15),
    billing_address TEXT,
    invoice_preferences ENUM('monthly', 'quarterly', 'custom') DEFAULT 'monthly',
    default_currency ENUM('USD', 'INR') DEFAULT 'USD',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_gst_number (gst_number)
);

-- User-Client mappings (for Client Managers)
CREATE TABLE user_client_mappings (
    user_id INT NOT NULL,
    client_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, client_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);

-- Client AWS mappings
CREATE TABLE client_aws_mappings (
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
CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    usd_to_inr_rate DECIMAL(10,4),
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
CREATE TABLE invoice_line_items (
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
CREATE TABLE invoice_attachments (
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
CREATE TABLE invoice_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    services TEXT,
    frequency ENUM('monthly', 'quarterly', 'custom') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_is_active (is_active)
);

-- Usage imports table
CREATE TABLE usage_imports (
    import_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    source ENUM('CSV', 'API') NOT NULL,
    status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
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
CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type ENUM('invoice', 'contract', 'usage_log', 'other') NOT NULL,
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
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    client_id INT,
    type ENUM('overdue', 'invoice_ready', 'system_alert') NOT NULL,
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

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
('Super Admin', 'Full system access, manages users, roles, configurations'),
('Client Manager', 'Manages assigned clients, invoices, usage imports'),
('Auditor', 'Read-only access to data, reporting, analytics');

-- Insert default role permissions
INSERT INTO role_module_access (role_id, module_name, can_view, can_create, can_edit, can_delete) VALUES
-- Super Admin permissions
(1, 'Users', TRUE, TRUE, TRUE, TRUE),
(1, 'Clients', TRUE, TRUE, TRUE, TRUE),
(1, 'Services', TRUE, TRUE, TRUE, TRUE),
(1, 'Invoices', TRUE, TRUE, TRUE, TRUE),
(1, 'Usage', TRUE, TRUE, TRUE, TRUE),
(1, 'Documents', TRUE, TRUE, TRUE, TRUE),
(1, 'Reports', TRUE, TRUE, TRUE, TRUE),
(1, 'Notifications', TRUE, TRUE, TRUE, TRUE),
(1, 'Analytics', TRUE, TRUE, TRUE, TRUE),

-- Client Manager permissions
(2, 'Users', TRUE, FALSE, FALSE, FALSE),
(2, 'Clients', TRUE, TRUE, TRUE, FALSE),
(2, 'Services', TRUE, FALSE, FALSE, FALSE),
(2, 'Invoices', TRUE, TRUE, TRUE, TRUE),
(2, 'Usage', TRUE, TRUE, TRUE, TRUE),
(2, 'Documents', TRUE, TRUE, TRUE, TRUE),
(2, 'Reports', TRUE, TRUE, FALSE, FALSE),
(2, 'Notifications', TRUE, FALSE, FALSE, FALSE),
(2, 'Analytics', TRUE, FALSE, FALSE, FALSE),

-- Auditor permissions
(3, 'Users', TRUE, FALSE, FALSE, FALSE),
(3, 'Clients', TRUE, FALSE, FALSE, FALSE),
(3, 'Services', TRUE, FALSE, FALSE, FALSE),
(3, 'Invoices', TRUE, FALSE, FALSE, FALSE),
(3, 'Usage', TRUE, FALSE, FALSE, FALSE),
(3, 'Documents', TRUE, FALSE, FALSE, FALSE),
(3, 'Reports', TRUE, TRUE, FALSE, FALSE),
(3, 'Notifications', TRUE, FALSE, FALSE, FALSE),
(3, 'Analytics', TRUE, FALSE, FALSE, FALSE);

-- Insert default service categories
INSERT INTO service_categories (category_name, description) VALUES
('Compute', 'Computing services like EC2, Lambda'),
('Storage', 'Storage services like S3, EBS'),
('Database', 'Database services like RDS, DynamoDB'),
('Networking', 'Networking services like VPC, CloudFront'),
('Analytics', 'Analytics services like Redshift, EMR'),
('Machine Learning', 'ML services like SageMaker'),
('Security', 'Security services like IAM, KMS'),
('Management', 'Management services like CloudWatch');