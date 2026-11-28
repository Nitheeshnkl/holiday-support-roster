-- Forward-only PO-03 constraint. MySQL applies this ALTER atomically; if existing
-- rows contain NULL or duplicate work_email values it fails without rewriting them.
-- Review and resolve the data with the customer before retrying this migration.
ALTER TABLE employee
    MODIFY COLUMN work_email VARCHAR(254) NOT NULL,
    ADD CONSTRAINT uq_employee_work_email UNIQUE (work_email);
