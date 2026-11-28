ALTER TABLE audit_event
    ADD CONSTRAINT fk_audit_event_actor_user_account
    FOREIGN KEY (actor_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;

ALTER TABLE notification_outbox
    ADD CONSTRAINT fk_notification_outbox_recipient_user_account
    FOREIGN KEY (recipient_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;
