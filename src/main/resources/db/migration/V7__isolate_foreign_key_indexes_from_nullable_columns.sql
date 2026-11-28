-- MySQL 9.7 SQL-layer FK checks can be skipped when an FK-leading index also
-- contains a nullable non-FK column and that indexed column is NULL. Bind each
-- relation to an index containing only non-null columns; keep query indexes with
-- the nullable date column first so they cannot be selected for FK enforcement.

ALTER TABLE notification_outbox
    DROP FOREIGN KEY fk_notification_outbox_recipient_user_account;
ALTER TABLE notification_outbox
    DROP INDEX ix_notification_outbox_recipient_read,
    ADD INDEX ix_notification_outbox_recipient_fk (recipient_user_account_id, id);
ALTER TABLE notification_outbox
    ADD CONSTRAINT fk_notification_outbox_recipient_user_account
        FOREIGN KEY (recipient_user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;

CREATE INDEX ix_notification_outbox_recipient_read
    ON notification_outbox (read_at_utc, recipient_user_account_id, created_at_utc);

ALTER TABLE team_membership
    DROP FOREIGN KEY fk_team_membership_employee,
    DROP FOREIGN KEY fk_team_membership_team;
ALTER TABLE team_membership
    DROP INDEX ix_team_membership_employee_interval,
    DROP INDEX ix_team_membership_team_interval,
    ADD INDEX ix_team_membership_employee_fk (employee_id, id),
    ADD INDEX ix_team_membership_team_fk (team_id, id);
ALTER TABLE team_membership
    ADD CONSTRAINT fk_team_membership_employee
        FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE RESTRICT;
ALTER TABLE team_membership
    ADD CONSTRAINT fk_team_membership_team
        FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE RESTRICT;

CREATE INDEX ix_team_membership_employee_interval
    ON team_membership (valid_from, valid_to, employee_id);
CREATE INDEX ix_team_membership_team_interval
    ON team_membership (valid_from, valid_to, team_id);

ALTER TABLE team_lead_assignment
    DROP FOREIGN KEY fk_team_lead_team,
    DROP FOREIGN KEY fk_team_lead_employee;
ALTER TABLE team_lead_assignment
    DROP INDEX ix_team_lead_team_interval,
    DROP INDEX ix_team_lead_employee_interval,
    ADD INDEX ix_team_lead_team_fk (team_id, id),
    ADD INDEX ix_team_lead_employee_fk (employee_id, id);
ALTER TABLE team_lead_assignment
    ADD CONSTRAINT fk_team_lead_team
        FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE RESTRICT;
ALTER TABLE team_lead_assignment
    ADD CONSTRAINT fk_team_lead_employee
        FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE RESTRICT;

CREATE INDEX ix_team_lead_team_interval
    ON team_lead_assignment (valid_from, valid_to, team_id);
CREATE INDEX ix_team_lead_employee_interval
    ON team_lead_assignment (valid_from, valid_to, employee_id);

ALTER TABLE user_role_assignment
    DROP FOREIGN KEY fk_user_role_assignment_account;
ALTER TABLE user_role_assignment
    DROP INDEX ix_user_role_effective,
    ADD INDEX ix_user_role_assignment_account_fk (user_account_id, id);
ALTER TABLE user_role_assignment
    ADD CONSTRAINT fk_user_role_assignment_account
        FOREIGN KEY (user_account_id) REFERENCES user_account(id) ON DELETE RESTRICT;

CREATE INDEX ix_user_role_effective
    ON user_role_assignment (valid_from, valid_to, user_account_id);
