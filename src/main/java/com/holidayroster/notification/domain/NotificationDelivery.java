package com.holidayroster.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_delivery")
public class NotificationDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_outbox_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private NotificationOutbox notificationOutbox;

    @Column(name = "channel_code", nullable = false, length = 20)
    private String channelCode;

    @Column(name = "attempt_number", nullable = false)
    private short attemptNumber;

    @Column(name = "delivery_status", nullable = false, length = 16)
    private String deliveryStatus;

    @Column(name = "provider_message_reference", length = 255)
    private String providerMessageReference;

    @Column(name = "attempted_at_utc", nullable = false)
    private LocalDateTime attemptedAtUtc;

    @Column(name = "failure_code", length = 80)
    private String failureCode;

    @Column(name = "failure_summary", length = 500)
    private String failureSummary;

    @Column(name = "created_at_utc", nullable = false)
    private LocalDateTime createdAtUtc;

    protected NotificationDelivery() {
    }

    public Long getId() {
        return id;
    }

    public NotificationOutbox getNotificationOutbox() {
        return notificationOutbox;
    }

    public String getChannelCode() {
        return channelCode;
    }

    public short getAttemptNumber() {
        return attemptNumber;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public String getProviderMessageReference() {
        return providerMessageReference;
    }

    public LocalDateTime getAttemptedAtUtc() {
        return attemptedAtUtc;
    }

    public String getFailureCode() {
        return failureCode;
    }

    public String getFailureSummary() {
        return failureSummary;
    }

    public LocalDateTime getCreatedAtUtc() {
        return createdAtUtc;
    }
}
