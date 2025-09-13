/*
# AWS Client Billing & Management System Database Schema
# Tej IT Solutions
# 
# This schema supports:
# - Multi-role user management (Super Admin, Client Manager, Auditor)
# - AWS-specific client management with multi-account support
# - Service catalog with multi-component pricing
# - Invoice management with GST calculations
# - AWS usage import and automated billing
# - Document management and audit trails
# - Background job tracking
*/

-- =============================================
-- 1. User & Role Management
-- =============================================

-- Roles table defining system roles
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Module access permissions per role
CREATE TABLE role_module_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    module_name VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_module (role_id, module_name)
);

-- Users table with role-based access
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- =============================================
-- 2. Client Management (AWS-specific)
-- =============================================

-- Clients table with AWS-specific fields
CREATE TABLE clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    aws_account_ids JSON, -- Array of AWS account IDs/payer IDs
    gst_registered BOOLEAN DEFAULT FALSE,
    gst_number VARCHAR(20) NULL,
    billing_address TEXT,
    invoice_preferences ENUM('monthly', 'quarterly', 'custom') DEFAULT 'monthly',
    default_currency ENUM('USD', 'INR') DEFAULT 'USD',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_status (status),
    INDEX idx_gst (gst_registered, gst_number)
);

-- Client-AWS account mapping for multi-account support
CREATE TABLE client_aws_mappings (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    aws_account_id VARCHAR(20) NOT NULL,
    aws_account_name VARCHAR(255),
    billing_tag_key VARCHAR(100), -- For cost allocation tags
    billing_tag_value VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    UNIQUE KEY unique_client_aws (client_id, aws_account_id),
    INDEX idx_aws_account (aws_account_id)
);

-- =============================================
-- 3. Service Catalog (AWS-Aware)
-- =============================================

-- Service categories aligned with AWS service groups
CREATE TABLE service_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    aws_service_group VARCHAR(100), -- Compute, Storage, Database, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AWS services with official service codes
CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL, -- EC2, S3, RDS, etc.
    service_category_id INT NOT NULL,
    aws_service_code VARCHAR(100), -- Matches AWS CUR service codes
    description TEXT,
    status ENUM('active', 'deprecated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_category_id) REFERENCES service_categories(category_id),
    INDEX idx_aws_service_code (aws_service_code),
    INDEX idx_status (status)
);

-- Pricing components for multi-component pricing (EC2 hours + EBS storage)
CREATE TABLE pricing_components (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    component_name VARCHAR(255) NOT NULL, -- Instance-Hours, Storage-GB, Requests
    metric_type ENUM('HOUR', 'GB', 'REQUEST', 'FIXED') NOT NULL,
    unit VARCHAR(50) NOT NULL, -- hour, GB-month, million requests
    rate DECIMAL(10,4) NOT NULL,
    billing_method ENUM('per_unit', 'tiered', 'flat') DEFAULT 'per_unit',
    currency ENUM('USD', 'INR') DEFAULT 'USD',
    tier_rules JSON, -- For tiered pricing rules
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    INDEX idx_service_component (service_id, component_name),
    INDEX idx_effective_dates (effective_from, effective_to)
);

-- =============================================
-- 4. Invoice Management
-- =============================================

-- Main invoices table
CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL UNIQUE, -- Format: TejIT-{clientID}-{YYYYMM}-{seq}
    client_id INT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    gst_applicable BOOLEAN DEFAULT FALSE,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency ENUM('USD', 'INR') DEFAULT 'USD',
    usd_to_inr_rate DECIMAL(8,4), -- Exchange rate if applicable
    status ENUM('draft', 'pending_approval', 'approved', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    invoice_notes TEXT,
    generated_by INT,
    approved_by INT,
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_file_path VARCHAR(500),
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (generated_by) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_client_date (client_id, invoice_date),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- Invoice line items with detailed AWS service breakdown
CREATE TABLE invoice_line_items (
    line_item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    service_id INT,
    component_id INT,
    line_description TEXT NOT NULL,
    aws_service_code VARCHAR(100),
    aws_usage_type VARCHAR(200),
    quantity DECIMAL(15,6) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,4) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    currency ENUM('USD', 'INR') DEFAULT 'USD',
    aws_account_id VARCHAR(20), -- Track which AWS account this charge belongs to
    billing_period_start DATE,
    billing_period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (component_id) REFERENCES pricing_components(component_id),
    INDEX idx_invoice_service (invoice_id, service_id),
    INDEX idx_aws_account (aws_account_id)
);

-- Recurring invoice templates for automation
CREATE TABLE recurring_invoice_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    frequency ENUM('monthly', 'quarterly', 'annually') NOT NULL,
    next_generation_date DATE NOT NULL,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    template_data JSON, -- Stores default services and pricing
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_client_template (client_id, status),
    INDEX idx_next_generation (next_generation_date, status)
);

-- =============================================
-- 5. AWS Usage Import Module
-- =============================================

-- Track AWS usage imports (CSV or API)
CREATE TABLE usage_imports (
    import_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    import_source ENUM('CSV', 'API', 'MANUAL') NOT NULL,
    file_name VARCHAR(500),
    file_path VARCHAR(500),
    aws_account_ids JSON, -- Array of AWS accounts in this import
    billing_period_start DATE,
    billing_period_end DATE,
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_log TEXT,
    imported_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (imported_by) REFERENCES users(user_id),
    INDEX idx_client_import (client_id, status),
    INDEX idx_status_date (status, created_at)
);

-- Detailed AWS usage records from imports
CREATE TABLE aws_usage_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    import_id INT NOT NULL,
    aws_account_id VARCHAR(20) NOT NULL,
    service_code VARCHAR(100) NOT NULL,
    usage_type VARCHAR(200),
    operation VARCHAR(200),
    resource_id VARCHAR(500),
    usage_start_date DATE,
    usage_end_date DATE,
    usage_quantity DECIMAL(15,6),
    unit VARCHAR(50),
    unblended_rate DECIMAL(10,6),
    unblended_cost DECIMAL(12,6),
    blended_rate DECIMAL(10,6),
    blended_cost DECIMAL(12,6),
    tags JSON, -- AWS resource tags
    processed BOOLEAN DEFAULT FALSE,
    invoice_id INT NULL, -- Link to generated invoice
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_id) REFERENCES usage_imports(import_id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    INDEX idx_import_account (import_id, aws_account_id),
    INDEX idx_service_usage (service_code, usage_type),
    INDEX idx_processed (processed),
    INDEX idx_usage_dates (usage_start_date, usage_end_date)
);

-- =============================================
-- 6. Document Management
-- =============================================

-- Document storage and management
CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    document_name VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT NOT NULL, -- Size in bytes
    mime_type VARCHAR(100),
    document_type ENUM('invoice', 'usage_report', 'contract', 'certificate', 'other') NOT NULL,
    entity_type ENUM('client', 'invoice', 'import', 'system') NOT NULL,
    entity_id INT, -- References client_id, invoice_id, import_id based on entity_type
    uploaded_by INT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_document_type (document_type),
    INDEX idx_uploaded_date (created_at)
);

-- =============================================
-- 7. Reports & Analytics
-- =============================================

-- Saved report configurations
CREATE TABLE saved_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL,
    report_type ENUM('client_summary', 'revenue_analysis', 'service_usage', 'gst_report', 'custom') NOT NULL,
    filters JSON, -- Report filters and parameters
    created_by INT NOT NULL,
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_frequency ENUM('daily', 'weekly', 'monthly') NULL,
    last_generated TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_report_type (report_type),
    INDEX idx_scheduled (is_scheduled, schedule_frequency)
);

-- =============================================
-- 8. Notifications & System Logs
-- =============================================

-- System notifications and alerts
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type ENUM('invoice_due', 'payment_overdue', 'import_completed', 'system_alert', 'reminder') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50), -- invoice, client, import
    entity_id INT,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_type_priority (type, priority),
    INDEX idx_created_date (created_at)
);

-- Background job tracking
CREATE TABLE background_jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    job_type ENUM('pdf_generation', 'email_send', 'usage_import', 'backup', 'report_generation') NOT NULL,
    job_data JSON, -- Job parameters and configuration
    status ENUM('queued', 'processing', 'completed', 'failed', 'retry') DEFAULT 'queued',
    priority INT DEFAULT 0,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_priority (status, priority),
    INDEX idx_job_type (job_type),
    INDEX idx_created_date (created_at)
);

-- =============================================
-- 9. Initial Data Setup
-- =============================================

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
('Super Admin', 'Full system access with all permissions'),
('Client Manager', 'Can manage assigned clients and generate invoices'),
('Auditor', 'Read-only access for reports and analytics');

-- Insert role permissions
INSERT INTO role_module_access (role_id, module_name, can_view, can_create, can_edit, can_delete) VALUES
-- Super Admin permissions
(1, 'dashboard', TRUE, TRUE, TRUE, TRUE),
(1, 'clients', TRUE, TRUE, TRUE, TRUE),
(1, 'users', TRUE, TRUE, TRUE, TRUE),
(1, 'roles', TRUE, TRUE, TRUE, TRUE),
(1, 'services', TRUE, TRUE, TRUE, TRUE),
(1, 'invoices', TRUE, TRUE, TRUE, TRUE),
(1, 'usage_import', TRUE, TRUE, TRUE, TRUE),
(1, 'documents', TRUE, TRUE, TRUE, TRUE),
(1, 'reports', TRUE, TRUE, TRUE, TRUE),
(1, 'notifications', TRUE, TRUE, TRUE, TRUE),

-- Client Manager permissions
(2, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(2, 'clients', TRUE, TRUE, TRUE, FALSE),
(2, 'services', TRUE, FALSE, FALSE, FALSE),
(2, 'invoices', TRUE, TRUE, TRUE, FALSE),
(2, 'usage_import', TRUE, TRUE, FALSE, FALSE),
(2, 'documents', TRUE, TRUE, FALSE, FALSE),
(2, 'reports', TRUE, FALSE, FALSE, FALSE),
(2, 'notifications', TRUE, FALSE, FALSE, FALSE),

-- Auditor permissions
(3, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(3, 'clients', TRUE, FALSE, FALSE, FALSE),
(3, 'invoices', TRUE, FALSE, FALSE, FALSE),
(3, 'documents', TRUE, FALSE, FALSE, FALSE),
(3, 'reports', TRUE, FALSE, FALSE, FALSE);

-- Insert default service categories
INSERT INTO service_categories (category_name, aws_service_group, description) VALUES
('Compute Services', 'Compute', 'EC2, Lambda, ECS, EKS and other compute services'),
('Storage Services', 'Storage', 'S3, EBS, EFS, Glacier and other storage services'),
('Database Services', 'Database', 'RDS, DynamoDB, ElastiCache and other database services'),
('Networking Services', 'Networking', 'CloudFront, Route53, VPC, Load Balancers'),
('Managed Services', 'Management', 'CloudWatch, CloudTrail, Config and other management services'),
('Security Services', 'Security', 'IAM, KMS, WAF, GuardDuty and other security services');

-- Insert sample AWS services
INSERT INTO services (service_name, service_category_id, aws_service_code, description) VALUES
('Amazon EC2', 1, 'AmazonEC2', 'Elastic Compute Cloud - Virtual servers in the cloud'),
('Amazon S3', 2, 'AmazonS3', 'Simple Storage Service - Object storage service'),
('Amazon RDS', 3, 'AmazonRDS', 'Relational Database Service - Managed database service'),
('Amazon CloudFront', 4, 'AmazonCloudFront', 'Content Delivery Network service'),
('AWS Lambda', 1, 'AWSLambda', 'Serverless compute service'),
('Amazon EBS', 2, 'AmazonEBS', 'Elastic Block Store - Block level storage');

-- Insert sample pricing components
INSERT INTO pricing_components (service_id, component_name, metric_type, unit, rate, currency, effective_from) VALUES
(1, 'EC2 Instance Hours', 'HOUR', 'hour', 0.0464, 'USD', '2024-01-01'),
(1, 'EBS Storage', 'GB', 'GB-month', 0.10, 'USD', '2024-01-01'),
(2, 'S3 Standard Storage', 'GB', 'GB-month', 0.023, 'USD', '2024-01-01'),
(2, 'S3 Requests', 'REQUEST', '1000-requests', 0.0004, 'USD', '2024-01-01'),
(3, 'RDS Instance Hours', 'HOUR', 'hour', 0.017, 'USD', '2024-01-01'),
(4, 'CloudFront Data Transfer', 'GB', 'GB', 0.085, 'USD', '2024-01-01');

-- Insert demo user
INSERT INTO users (username, email, password_hash, role_id) VALUES
('admin', 'admin@tejit.com', 'password123', 1),
('manager', 'manager@tejit.com', 'password123', 2),
('auditor', 'auditor@tejit.com', 'password123', 3);

/*
# Database Indexes for Performance Optimization

Key indexes created:
1. User authentication: email, status
2. Client management: status, GST registration
3. AWS mappings: account lookups
4. Invoice management: client-date combinations, status tracking
5. Usage imports: processing status, date ranges
6. Document management: entity relationships
7. Background jobs: processing queues

# Relationships Overview

1. Users → Roles (many-to-one)
2. Clients → AWS Mappings (one-to-many)
3. Services → Categories (many-to-one)
4. Services → Pricing Components (one-to-many)
5. Invoices → Line Items (one-to-many)
6. Usage Imports → Usage Records (one-to-many)
7. Documents → Various Entities (polymorphic)

# Business Logic Notes

1. Invoice numbering: TejIT-{clientID}-{YYYYMM}-{sequence}
2. GST calculation: Only applied if client.gst_registered = TRUE
3. Multi-currency support: USD/INR with exchange rates
4. AWS account mapping: Supports multiple accounts per client
5. Recurring invoices: Automated via templates and scheduling
6. Background jobs: Async processing for heavy operations

# Security Considerations

1. Role-based access control via role_module_access
2. User authentication with password hashing
3. Document access control via is_public flag
4. Audit trail via created_by, updated_at fields
5. Soft deletes where appropriate (status fields)
*/