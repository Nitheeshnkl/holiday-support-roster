-- API v1 preserves its historical 160-character team-name limit. API v2 DTO validation
-- remains capped at 120 characters. Widening storage is forward-only and preserves rows.
ALTER TABLE team
    MODIFY COLUMN team_name VARCHAR(160) NOT NULL;
