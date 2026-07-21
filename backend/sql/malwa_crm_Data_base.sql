-- =========================================================================
-- Malwa CRM - MySQL Database Schema (Option B)
-- Aligned with BACKEND_COMPLETE_ARCHITECTURE module/store map
--
-- HOSTINGER / shared hosting:
--   1. hPanel -> Databases -> create DB (e.g. uXXXX_Malwa_crm)
--   2. phpMyAdmin -> SELECT that database (left sidebar)
--   3. Import THIS file (do NOT run CREATE DATABASE)
--   This file has no CREATE DATABASE (avoids error #1044)
--
-- Local MySQL (full control):
--   CREATE DATABASE malwa_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE malwa_crm;
--   then import this file
--
-- After import:
--   update backend/.env DATABASE_URL with your Hostinger DB name/user/pass
--   python -m scripts.seed_admin
-- =========================================================================

-- NOTE: No CREATE DATABASE / USE here — Hostinger users lack that privilege.
-- Make sure your target database is already selected in phpMyAdmin.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------------------
-- Table: crm_accounts
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_accounts (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_audit_logs
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_audit_logs (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_backup_history
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_backup_history (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_branches
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_branches (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_cash_receipts
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_cash_receipts (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_challan
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_challan (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_challan_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_challan_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_conflicts
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_conflicts (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_customer_jobs
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_customer_jobs (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_customer_ledger_entries
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_customer_ledger_entries (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_customers
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_customers (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(255), 
	phone VARCHAR(64), 
	email VARCHAR(255), 
	type VARCHAR(64) NOT NULL, 
	company VARCHAR(255), 
	status VARCHAR(32) NOT NULL, 
	address TEXT, 
	city VARCHAR(128), 
	state VARCHAR(128), 
	pincode VARCHAR(32), 
	gstin VARCHAR(32), 
	pan VARCHAR(32), 
	credit_limit NUMERIC(15, 2) NOT NULL, 
	credit_days INTEGER NOT NULL, 
	opening_balance NUMERIC(15, 2) NOT NULL, 
	current_balance NUMERIC(15, 2) NOT NULL, 
	vehicles JSON, 
	documents JSON, 
	notes TEXT, 
	`convertedAt` DATETIME, 
	`convertedFrom` VARCHAR(64), 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_daily_tasks
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_daily_tasks (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_documents
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_documents (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_estimate_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_estimate_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_estimates
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_estimates (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_gst_accounts
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_gst_accounts (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_gstledger
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_gstledger (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_hsn_codes
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_hsn_codes (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_inspections
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_inspections (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_inventory_categories
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_inventory_categories (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(255), 
	description TEXT, 
	parent_id VARCHAR(36), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_inventory_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_inventory_items (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(255), 
	material_name VARCHAR(255), 
	code VARCHAR(64), 
	category_id VARCHAR(36), 
	unit VARCHAR(32), 
	current_stock NUMERIC(15, 2) NOT NULL, 
	stock_quantity NUMERIC(15, 2) NOT NULL, 
	min_stock NUMERIC(15, 2) NOT NULL, 
	cost_price NUMERIC(15, 2) NOT NULL, 
	selling_price NUMERIC(15, 2) NOT NULL, 
	location VARCHAR(128), 
	hsn_code VARCHAR(32), 
	description TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_invoice_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_invoice_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_invoices
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_invoices (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_jobs
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_jobs (
	id VARCHAR(36) NOT NULL, 
	job_no VARCHAR(64), 
	status VARCHAR(64), 
	`customerId` VARCHAR(36), 
	customer_id VARCHAR(36), 
	customer_name VARCHAR(255), 
	party_name VARCHAR(255), 
	vehicle_no VARCHAR(64), 
	`vehicleNo` VARCHAR(64), 
	`vehicleModel` VARCHAR(128), 
	`vehicleType` VARCHAR(64), 
	`vehicleColor` VARCHAR(64), 
	`kmReading` INTEGER, 
	`scheduledStart` DATETIME, 
	`scheduledEnd` DATETIME, 
	`actualStart` DATETIME, 
	`actualEnd` DATETIME, 
	description TEXT, 
	notes TEXT, 
	`syncStatus` VARCHAR(32), 
	`createdAt` DATETIME, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_jobsheet_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_jobsheet_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_jobsheets
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_jobsheets (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_journal_entries
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_journal_entries (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_journal_lines
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_journal_lines (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_labour
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_labour (
	id VARCHAR(36) NOT NULL, 
	code VARCHAR(64), 
	name VARCHAR(255), 
	phone VARCHAR(64), 
	address TEXT, 
	skill_type VARCHAR(128), 
	designation VARCHAR(128), 
	hourly_rate NUMERIC(15, 2) NOT NULL, 
	daily_rate NUMERIC(15, 2) NOT NULL, 
	vendor_id VARCHAR(36), 
	`vendorId` VARCHAR(36), 
	`technicianId` VARCHAR(36), 
	`employeeId` VARCHAR(36), 
	status VARCHAR(32) NOT NULL, 
	opening_balance NUMERIC(15, 2) NOT NULL, 
	current_balance NUMERIC(15, 2) NOT NULL, 
	notes TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_labour_attendance
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_labour_attendance (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_labour_ledger_entries
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_labour_ledger_entries (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_ledger_views
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_ledger_views (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_meta
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_meta (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_offline_operations
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_offline_operations (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_payments
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_payments (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_permissions
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_permissions (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_products
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_products (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(255), 
	code VARCHAR(64), 
	category VARCHAR(128), 
	price NUMERIC(15, 2) NOT NULL, 
	stock NUMERIC(15, 2) NOT NULL, 
	unit VARCHAR(32), 
	description TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_profiles
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_profiles (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36), 
	name VARCHAR(255), 
	email VARCHAR(255), 
	username VARCHAR(255), 
	`role` VARCHAR(64) NOT NULL, 
	`roleId` VARCHAR(36), 
	branch_id VARCHAR(36), 
	permissions JSON, 
	status VARCHAR(32) NOT NULL, 
	avatar TEXT, 
	phone VARCHAR(64), 
	address TEXT, 
	bio TEXT, 
	last_login DATETIME, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_purchase_challan_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_purchase_challan_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_purchase_challans
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_purchase_challans (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_purchase_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_purchase_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_purchases
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_purchases (
	id VARCHAR(36) NOT NULL, 
	invoice_no VARCHAR(64), 
	invoice_date DATETIME, 
	date DATETIME, 
	supplier_id VARCHAR(36), 
	`supplierId` VARCHAR(36), 
	supplier_name VARCHAR(255), 
	status VARCHAR(32) NOT NULL, 
	subtotal NUMERIC(15, 2) NOT NULL, 
	tax_amount NUMERIC(15, 2) NOT NULL, 
	total_amount NUMERIC(15, 2) NOT NULL, 
	paid_amount NUMERIC(15, 2) NOT NULL, 
	materials JSON, 
	notes TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_rate_history
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_rate_history (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_rate_list_memory
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_rate_list_memory (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_receipts
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_receipts (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_roles
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_roles (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_sell_challan_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_sell_challan_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_sellchallan
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_sellchallan (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_sequences
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_sequences (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_service_orders
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_service_orders (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_settings
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_settings (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_stock_movements
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_stock_movements (
	id VARCHAR(36) NOT NULL, 
	item_id VARCHAR(36), 
	movement_type VARCHAR(64), 
	quantity NUMERIC(15, 2) NOT NULL, 
	movement_date DATETIME, 
	date DATETIME, 
	reference_type VARCHAR(64), 
	reference_id VARCHAR(36), 
	notes TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_stock_transactions
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_stock_transactions (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_supplier_ledger_entries
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_supplier_ledger_entries (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_supplier_products
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_supplier_products (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_suppliers
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_suppliers (
	id VARCHAR(36) NOT NULL, 
	code VARCHAR(64), 
	name VARCHAR(255), 
	company VARCHAR(255), 
	phone VARCHAR(64), 
	email VARCHAR(255), 
	category VARCHAR(128), 
	address TEXT, 
	city VARCHAR(128), 
	state VARCHAR(128), 
	pincode VARCHAR(32), 
	gstin VARCHAR(32), 
	status VARCHAR(32) NOT NULL, 
	opening_balance NUMERIC(15, 2) NOT NULL, 
	current_balance NUMERIC(15, 2) NOT NULL, 
	notes TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_syncQueue
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `crm_syncQueue` (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_sync_status
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_sync_status (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_system_logs
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_system_logs (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_taxes
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_taxes (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_templates
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_templates (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_users
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_users (
	id VARCHAR(36) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	username VARCHAR(255), 
	name VARCHAR(255), 
	password VARCHAR(255) NOT NULL, 
	`role` VARCHAR(64) NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	phone VARCHAR(64), 
	avatar TEXT, 
	preferences JSON, 
	last_login DATETIME, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vendor_invoice_items
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vendor_invoice_items (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vendor_invoices
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vendor_invoices (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vendor_ledger_entries
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vendor_ledger_entries (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vendor_orders
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vendor_orders (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vendor_services
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vendor_services (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vendors
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vendors (
	id VARCHAR(36) NOT NULL, 
	code VARCHAR(64), 
	name VARCHAR(255), 
	company VARCHAR(255), 
	phone VARCHAR(64), 
	email VARCHAR(255), 
	address TEXT, 
	city VARCHAR(128), 
	state VARCHAR(128), 
	pincode VARCHAR(32), 
	gstin VARCHAR(32), 
	pan VARCHAR(32), 
	`serviceType` VARCHAR(128), 
	`vendorType` VARCHAR(64), 
	status VARCHAR(32) NOT NULL, 
	opening_balance NUMERIC(15, 2) NOT NULL, 
	current_balance NUMERIC(15, 2) NOT NULL, 
	notes TEXT, 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_vouchers
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_vouchers (
	id VARCHAR(36) NOT NULL, 
	voucher_no VARCHAR(64), 
	voucher_type VARCHAR(64), 
	voucher_date DATETIME, 
	date DATETIME, 
	payee_id VARCHAR(36), 
	payee_type VARCHAR(64), 
	payee_name VARCHAR(255), 
	amount NUMERIC(15, 2) NOT NULL, 
	particulars TEXT, 
	payment_mode VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: crm_weekly_balances
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_weekly_balances (
	id VARCHAR(36) NOT NULL, 
	status VARCHAR(64), 
	data_json JSON, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	deleted_at DATETIME, 
	synced_from VARCHAR(50), 
	PRIMARY KEY (id)
);

SET FOREIGN_KEY_CHECKS = 1;

-- Done. Tables created: 70
-- Next: python -m scripts.seed_admin