CREATE TABLE employee (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_code VARCHAR(40) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(160) NULL,
    work_email VARCHAR(254) NULL,
    employment_start_date DATE NOT NULL,
    employment_end_date DATE NULL,
    rotation_eligible_from DATE NULL,
    rotation_eligible_to DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(500) NULL,
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uq_employee_code UNIQUE (employee_code),
    CONSTRAINT ck_employee_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_employee_employment_dates CHECK (employment_end_date IS NULL OR employment_end_date >= employment_start_date),
    CONSTRAINT ck_employee_eligibility_dates CHECK (rotation_eligible_to IS NULL OR rotation_eligible_from IS NULL OR rotation_eligible_to >= rotation_eligible_from),
    INDEX ix_employee_status_eligibility (status, rotation_eligible_from, rotation_eligible_to),
    INDEX ix_employee_work_email (work_email)
) ENGINE=InnoDB;

CREATE TABLE team (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    team_code VARCHAR(40) NOT NULL,
    team_name VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uq_team_code UNIQUE (team_code),
    CONSTRAINT ck_team_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_team_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
) ENGINE=InnoDB;

CREATE TABLE team_membership (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL,
    team_id BIGINT UNSIGNED NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    membership_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_team_membership_employee FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE RESTRICT,
    CONSTRAINT fk_team_membership_team FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE RESTRICT,
    CONSTRAINT ck_team_membership_dates CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CONSTRAINT ck_team_membership_status CHECK (membership_status IN ('ACTIVE', 'ENDED')),
    INDEX ix_team_membership_employee_interval (employee_id, valid_from, valid_to),
    INDEX ix_team_membership_team_interval (team_id, valid_from, valid_to)
) ENGINE=InnoDB;

CREATE TABLE team_lead_assignment (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    team_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by_user_account_id BIGINT UNSIGNED NULL,
    created_at_utc DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_team_lead_team FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE RESTRICT,
    CONSTRAINT fk_team_lead_employee FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE RESTRICT,
    CONSTRAINT ck_team_lead_dates CHECK (valid_to IS NULL OR valid_to >= valid_from),
    INDEX ix_team_lead_team_interval (team_id, valid_from, valid_to),
    INDEX ix_team_lead_employee_interval (employee_id, valid_from, valid_to)
) ENGINE=InnoDB;
