package com.holidayroster.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_event")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_account_id", columnDefinition = "BIGINT UNSIGNED")
    private Long actorUserAccountId;

    @Column(name = "actor_type", nullable = false, length = 16)
    private String actorType;

    @Column(name = "action_code", nullable = false, length = 100)
    private String actionCode;

    @Column(name = "target_type", nullable = false, length = 60)
    private String targetType;

    @Column(name = "target_id", columnDefinition = "BIGINT UNSIGNED")
    private Long targetId;

    @Column(name = "occurred_at_utc", nullable = false)
    private LocalDateTime occurredAtUtc;

    @Column(length = 1000)
    private String reason;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "before_reference", length = 255)
    private String beforeReference;

    @Column(name = "after_reference", length = 255)
    private String afterReference;

    @Column(name = "source_module", nullable = false, length = 60)
    private String sourceModule;

    @Column(name = "created_at_utc", nullable = false)
    private LocalDateTime createdAtUtc;

    protected AuditEvent() {
    }

    public Long getId() {
        return id;
    }

    public Long getActorUserAccountId() {
        return actorUserAccountId;
    }

    public String getActorType() {
        return actorType;
    }

    public String getActionCode() {
        return actionCode;
    }

    public String getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public LocalDateTime getOccurredAtUtc() {
        return occurredAtUtc;
    }

    public String getReason() {
        return reason;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public String getBeforeReference() {
        return beforeReference;
    }

    public String getAfterReference() {
        return afterReference;
    }

    public String getSourceModule() {
        return sourceModule;
    }

    public LocalDateTime getCreatedAtUtc() {
        return createdAtUtc;
    }
}
