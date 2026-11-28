-- V3 creates user_account before these references are added. Existing NULL actor/recipient
-- values remain NULL. Inventory non-NULL values before running this migration; MySQL rejects
-- an unresolved reference and no actor IDs are rewritten or fabricated here.
ALTER TABLE team_lead_assignment
    ADD COLUMN row_version BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT fk_team_lead_assigned_by_user_account
        FOREIGN KEY (assigned_by_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;

ALTER TABLE audit_event
    ADD CONSTRAINT fk_audit_event_actor_user_account
        FOREIGN KEY (actor_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;

ALTER TABLE notification_outbox
    ADD CONSTRAINT fk_notification_outbox_recipient_user_account
        FOREIGN KEY (recipient_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;
