-- Seed initial data for AWS Billing Management System

-- Insert default roles
INSERT IGNORE INTO roles (role_name, description) VALUES
('Super Admin', 'Full system access with all permissions'),
('Client Manager', 'Can manage assigned clients and generate invoices'),
('Auditor', 'Read-only access for reports and analytics');

-- Insert role permissions
INSERT IGNORE INTO role_module_access (role_id, module_name, can_view, can_create, can_edit, can_delete) VALUES
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
(1, 'analytics', TRUE, TRUE, TRUE, TRUE),

-- Client Manager permissions
(2, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(2, 'clients', TRUE, TRUE, TRUE, FALSE),
(2, 'services', TRUE, FALSE, FALSE, FALSE),
(2, 'invoices', TRUE, TRUE, TRUE, FALSE),
(2, 'usage_import', TRUE, TRUE, FALSE, FALSE),
(2, 'documents', TRUE, TRUE, FALSE, FALSE),
(2, 'reports', TRUE, FALSE, FALSE, FALSE),
(2, 'notifications', TRUE, FALSE, FALSE, FALSE),
(2, 'analytics', TRUE, FALSE, FALSE, FALSE),

-- Auditor permissions
(3, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(3, 'clients', TRUE, FALSE, FALSE, FALSE),
(3, 'invoices', TRUE, FALSE, FALSE, FALSE),
(3, 'documents', TRUE, FALSE, FALSE, FALSE),
(3, 'reports', TRUE, FALSE, FALSE, FALSE),
(3, 'usage_import', TRUE, FALSE, FALSE, FALSE),
(3, 'notifications', TRUE, FALSE, FALSE, FALSE),
(3, 'analytics', TRUE, FALSE, FALSE, FALSE);

-- Insert default service categories
INSERT IGNORE INTO service_categories (category_name, description) VALUES
('Compute', 'Computing services like EC2, Lambda'),
('Storage', 'Storage services like S3, EBS'),
('Database', 'Database services like RDS, DynamoDB'),
('Networking', 'Networking services like VPC, CloudFront'),
('Analytics', 'Analytics services like Redshift, EMR'),
('Machine Learning', 'ML services like SageMaker'),
('Security', 'Security services like IAM, KMS'),
('Management', 'Management services like CloudWatch');

-- Insert sample services
INSERT IGNORE INTO services (service_name, service_category_id, aws_service_code, description) VALUES
('Amazon EC2', 1, 'AmazonEC2', 'Elastic Compute Cloud - Virtual servers'),
('Amazon S3', 2, 'AmazonS3', 'Simple Storage Service - Object storage'),
('Amazon RDS', 3, 'AmazonRDS', 'Relational Database Service'),
('Amazon CloudFront', 4, 'AmazonCloudFront', 'Content Delivery Network'),
('AWS Lambda', 1, 'AWSLambda', 'Serverless compute service'),
('Amazon EBS', 2, 'AmazonEBS', 'Elastic Block Store');

-- Insert sample pricing components
INSERT IGNORE INTO pricing_components (service_id, component_name, metric_type, unit, rate, currency) VALUES
(1, 'EC2 Instance Hours', 'hour', 'hour', 0.0464, 'USD'),
(1, 'EBS Storage', 'gb', 'GB-month', 0.10, 'USD'),
(2, 'S3 Standard Storage', 'gb', 'GB-month', 0.023, 'USD'),
(2, 'S3 Requests', 'request', '1000-requests', 0.0004, 'USD'),
(3, 'RDS Instance Hours', 'hour', 'hour', 0.017, 'USD'),
(4, 'CloudFront Data Transfer', 'gb', 'GB', 0.085, 'USD');

-- Insert demo users (passwords will be hashed by the application)
INSERT IGNORE INTO users (username, email, password_hash, role_id) VALUES
('admin', 'admin@tejit.com', 'password', 1),
('manager', 'manager@tejit.com', 'password', 2),
('auditor', 'auditor@tejit.com', 'password', 3);

-- Insert sample client
INSERT IGNORE INTO clients (client_name, contact_person, email, phone, aws_account_ids, gst_registered, gst_number, billing_address, default_currency) VALUES
('TechCorp Inc', 'John Smith', 'john@techcorp.com', '+1-555-0123', '["123456789012", "123456789013"]', TRUE, '27AAECB1234C1Z5', '123 Tech Street\nSuite 100\nSan Francisco, CA 94105', 'USD'),
('DataFlow Ltd', 'Sarah Johnson', 'sarah@dataflow.com', '+1-555-0456', '["123456789014"]', FALSE, NULL, '456 Data Avenue\nNew York, NY 10001', 'USD'),
('CloudTech Solutions', 'Raj Patel', 'raj@cloudtech.in', '+91-98765-43210', '["123456789015", "123456789016"]', TRUE, '29ABCDE1234F1Z5', 'Plot 123, Tech Park\nBangalore, Karnataka 560001\nIndia', 'INR');