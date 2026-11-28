CREATE TABLE holiday (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, holiday_name VARCHAR(160) NOT NULL, holiday_date DATE NOT NULL,
    primary_count SMALLINT UNSIGNED NOT NULL, standby_count SMALLINT UNSIGNED NOT NULL,
    duty_window_start_utc DATETIME(6) NULL, duty_window_end_utc DATETIME(6) NULL, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at_utc DATETIME(6) NOT NULL, updated_at_utc DATETIME(6) NOT NULL, row_version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_holiday PRIMARY KEY (id), CONSTRAINT uq_holiday_date UNIQUE (holiday_date),
    CONSTRAINT ck_holiday_counts CHECK (primary_count >= 1 AND standby_count >= 0),
    CONSTRAINT ck_holiday_window CHECK (duty_window_end_utc IS NULL OR duty_window_start_utc IS NULL OR duty_window_end_utc >= duty_window_start_utc),
    CONSTRAINT ck_holiday_status CHECK (status IN ('ACTIVE','INACTIVE','CANCELLED')),
    INDEX ix_holiday_date_status (holiday_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE availability_record (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, employee_id BIGINT UNSIGNED NOT NULL, availability_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL, end_date DATE NOT NULL, reason_code VARCHAR(40) NULL, employee_note VARCHAR(500) NULL,
    recorded_by_user_account_id BIGINT UNSIGNED NULL, recorded_at_utc DATETIME(6) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    supersedes_availability_record_id BIGINT UNSIGNED NULL, created_at_utc DATETIME(6) NOT NULL, updated_at_utc DATETIME(6) NOT NULL, row_version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_availability_record PRIMARY KEY (id),
    CONSTRAINT fk_availability_employee FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE RESTRICT,
    CONSTRAINT fk_availability_recorded_by FOREIGN KEY (recorded_by_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT fk_availability_supersedes FOREIGN KEY (supersedes_availability_record_id) REFERENCES availability_record(id) ON DELETE RESTRICT,
    CONSTRAINT ck_availability_type CHECK (availability_type IN ('AVAILABLE','UNAVAILABLE')),
    CONSTRAINT ck_availability_dates CHECK (end_date >= start_date), CONSTRAINT ck_availability_status CHECK (status IN ('ACTIVE','CANCELLED','SUPERSEDED')),
    INDEX ix_availability_employee_interval (employee_id, start_date, end_date, status), INDEX ix_availability_interval (start_date, end_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
