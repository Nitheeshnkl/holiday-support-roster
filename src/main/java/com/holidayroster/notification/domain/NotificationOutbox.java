package com.holidayroster.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_outbox")
public class NotificationOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_key", nullable = false, unique = true, length = 120)
    private String eventKey;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "aggregate_type", nullable = false, length = 60)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Long aggregateId;

    @Column(name = "recipient_user_account_id", columnDefinition = "BIGINT UNSIGNED")
    private Long recipientUserAccountId;

    @Column(name = "read_at_utc")
    private LocalDateTime readAtUtc;

    @Column(name = "recipient_address_snapshot", length = 254)
    private String recipientAddressSnapshot;

    @Column(name = "template_code", nullable = false, length = 80)
    private String templateCode;

    @Column(name = "payload_text", columnDefinition = "TEXT")
    private String payloadText;

    @Column(name = "delivery_status", nullable = false, length = 16)
    private String deliveryStatus;

    @Column(name = "attempt_count", nullable = false)
    private short attemptCount;

    @Column(name = "next_attempt_at_utc")
    private LocalDateTime nextAttemptAtUtc;

    @Column(name = "created_at_utc", nullable = false)
    private LocalDateTime createdAtUtc;

    @Column(name = "updated_at_utc", nullable = false)
    private LocalDateTime updatedAtUtc;

    protected NotificationOutbox() {
    }

    public Long getId() {
        return id;
    }

    public String getEventKey() {
        return eventKey;
    }

    public String getEventType() {
        return eventType;
    }

    public String getAggregateType() {
        return aggregateType;
    }

    public Long getAggregateId() {
        return aggregateId;
    }

    public Long getRecipientUserAccountId() {
        return recipientUserAccountId;
    }

    public LocalDateTime getReadAtUtc() {
        return readAtUtc;
    }

    public String getRecipientAddressSnapshot() {
        return recipientAddressSnapshot;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public String getPayloadText() {
        return payloadText;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public short getAttemptCount() {
        return attemptCount;
    }

    public LocalDateTime getNextAttemptAtUtc() {
        return nextAttemptAtUtc;
    }

    public LocalDateTime getCreatedAtUtc() {
        return createdAtUtc;
    }

    public LocalDateTime getUpdatedAtUtc() {
        return updatedAtUtc;
    }
}
