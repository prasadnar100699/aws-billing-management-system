/*
  # Initial Database Schema

  1. New Tables
    - `roles` - User roles (Super Admin, Client Manager, Auditor)
    - `role_module_access` - Role-based permissions for modules
    - `users` - System users with role assignments
    - `audit_logs` - Audit trail for user actions
    - `service_categories` - AWS service categories (Compute, Storage, etc.)
    - `services` - AWS services with service codes
    - `pricing_components` - Multi-component pricing for services
    - `clients` - Client information with AWS account mappings
    - `user_client_mappings` - Client Manager assignments
    - `client_aws_mappings` - AWS account to client mappings
    - `invoices` - Invoice management with GST support
    - `invoice_line_items` - Invoice line items with discounts
    - `invoice_attachments` - Invoice file attachments
    - `invoice_templates` - Recurring invoice templates
    - `usage_imports` - AWS usage data import tracking
    - `documents` - Document management system
    - `notifications` - System notifications and alerts

  2. Security
    - Enable proper indexing for performance
    - Foreign key constraints for data integrity
    - Enum constraints for data validation
    - Unique constraints where appropriate

  3. Features
    - Multi-currency support (USD, INR)
    - GST compliance for Indian clients
    - AWS account mapping and tagging
    - Multi-component pricing support
    - Audit logging for all actions
    - Role-based access control
*/

-- This file contains the complete schema from schema.sql
-- Run this as the initial migration

SOURCE database/schema.sql;