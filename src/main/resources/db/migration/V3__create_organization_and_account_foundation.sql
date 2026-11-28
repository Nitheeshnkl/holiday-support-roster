CREATE TABLE organisation_setting (
    id BIGINT UNSIGNED NOT NULL,
    organisation_name VARCHAR(160) NOT NULL,
    timezone_id VARCHAR(64) NOT NULL,
    locale_code VARCHAR(16) NOT NULL DEFAULT 'en',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_organisation_setting PRIMARY KEY (id),
    CONSTRAINT ck_organisation_setting_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_account (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    last_login_at_utc DATETIME(6) NULL,
    password_changed_at_utc DATETIME(6) NULL,
    failed_login_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until_utc DATETIME(6) NULL,
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uq_user_account_employee UNIQUE (employee_id),
    CONSTRAINT uq_user_account_username UNIQUE (username),
    CONSTRAINT uq_user_account_email UNIQUE (email),
    CONSTRAINT fk_user_account_employee FOREIGN KEY (employee_id)
        REFERENCES employee(id) ON DELETE RESTRICT,
    CONSTRAINT ck_user_account_status CHECK (account_status IN ('ACTIVE', 'LOCKED', 'DISABLED', 'PENDING')),
    INDEX ix_user_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE account_action_token (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_account_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    expires_at_utc DATETIME(6) NOT NULL,
    consumed_at_utc DATETIME(6) NULL,
    created_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_account_action_token PRIMARY KEY (id),
    CONSTRAINT uq_account_action_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_account_action_token_account FOREIGN KEY (user_account_id)
        REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT ck_account_action_token_purpose CHECK (purpose IN ('INVITATION', 'PASSWORD_RESET')),
    INDEX ix_account_action_token_account_purpose_expiry
        (user_account_id, purpose, expires_at_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE app_role (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_code VARCHAR(40) NOT NULL,
    role_name VARCHAR(80) NOT NULL,
    description VARCHAR(500) NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_app_role PRIMARY KEY (id),
    CONSTRAINT uq_app_role_code UNIQUE (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE permission (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    permission_code VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    resource_type VARCHAR(60) NOT NULL,
    action_code VARCHAR(40) NOT NULL,
    created_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_permission PRIMARY KEY (id),
    CONSTRAINT uq_permission_code UNIQUE (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE role_permission (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_role_permission PRIMARY KEY (id),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id),
    CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id)
        REFERENCES app_role(id) ON DELETE RESTRICT,
    CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id)
        REFERENCES permission(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_role_assignment (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_account_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    assigned_by_user_account_id BIGINT UNSIGNED NULL,
    reason VARCHAR(500) NULL,
    created_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_user_role_assignment PRIMARY KEY (id),
    CONSTRAINT fk_user_role_assignment_account FOREIGN KEY (user_account_id)
        REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_role_assignment_role FOREIGN KEY (role_id)
        REFERENCES app_role(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_role_assignment_actor FOREIGN KEY (assigned_by_user_account_id)
        REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT ck_user_role_assignment_dates CHECK (valid_to IS NULL OR valid_to >= valid_from),
    INDEX ix_user_role_effective (user_account_id, valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
