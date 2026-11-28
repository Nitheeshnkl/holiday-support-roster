CREATE TABLE audit_event (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_account_id BIGINT UNSIGNED NULL,
    actor_type VARCHAR(16) NOT NULL,
    action_code VARCHAR(100) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id BIGINT UNSIGNED NULL,
    occurred_at_utc DATETIME(6) NOT NULL,
    reason VARCHAR(1000) NULL,
    correlation_id VARCHAR(64) NULL,
    before_reference VARCHAR(255) NULL,
    after_reference VARCHAR(255) NULL,
    source_module VARCHAR(60) NOT NULL,
    created_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_audit_event PRIMARY KEY (id),
    CONSTRAINT ck_audit_event_actor_type CHECK (actor_type IN ('USER', 'SYSTEM')),
    INDEX ix_audit_event_target_time (target_type, target_id, occurred_at_utc),
    INDEX ix_audit_event_actor_time (actor_user_account_id, occurred_at_utc),
    INDEX ix_audit_event_action_time (action_code, occurred_at_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notification_outbox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_key VARCHAR(120) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(60) NOT NULL,
    aggregate_id BIGINT UNSIGNED NOT NULL,
    recipient_user_account_id BIGINT UNSIGNED NULL,
    read_at_utc DATETIME(6) NULL,
    recipient_address_snapshot VARCHAR(254) NULL,
    template_code VARCHAR(80) NOT NULL,
    payload_text TEXT NULL,
    delivery_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    next_attempt_at_utc DATETIME(6) NULL,
    created_at_utc DATETIME(6) NOT NULL,
    updated_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_notification_outbox PRIMARY KEY (id),
    CONSTRAINT uk_notification_outbox_event_key UNIQUE (event_key),
    CONSTRAINT ck_notification_outbox_delivery_status
        CHECK (delivery_status IN ('PENDING', 'PROCESSING', 'RETRY', 'DELIVERED', 'FAILED')),
    INDEX ix_notification_outbox_dispatch (delivery_status, next_attempt_at_utc, id),
    INDEX ix_notification_outbox_recipient_read (recipient_user_account_id, read_at_utc, created_at_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notification_delivery (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    notification_outbox_id BIGINT UNSIGNED NOT NULL,
    channel_code VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    attempt_number SMALLINT UNSIGNED NOT NULL,
    delivery_status VARCHAR(16) NOT NULL,
    provider_message_reference VARCHAR(255) NULL,
    attempted_at_utc DATETIME(6) NOT NULL,
    failure_code VARCHAR(80) NULL,
    failure_summary VARCHAR(500) NULL,
    created_at_utc DATETIME(6) NOT NULL,
    CONSTRAINT pk_notification_delivery PRIMARY KEY (id),
    CONSTRAINT fk_notification_delivery_outbox
        FOREIGN KEY (notification_outbox_id) REFERENCES notification_outbox(id) ON DELETE RESTRICT,
    CONSTRAINT uk_notification_delivery_attempt
        UNIQUE (notification_outbox_id, channel_code, attempt_number),
    CONSTRAINT ck_notification_delivery_channel CHECK (channel_code IN ('EMAIL', 'IN_APP')),
    CONSTRAINT ck_notification_delivery_status CHECK (delivery_status IN ('PENDING', 'SENT', 'FAILED')),
    INDEX ix_notification_delivery_status_time (delivery_status, attempted_at_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
