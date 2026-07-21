-- Run this in phpMyAdmin AFTER or AFTER import, with database
-- u808821982_Malwa_crm already selected on the left.

SHOW TABLES LIKE 'crm_%';

-- Expected: ~70 tables (crm_customers, crm_jobs, crm_users, ...)
-- If 0 rows: import backend/sql/malwa_crm_Data_base.sql again
--            (make sure left sidebar DB is selected first)
