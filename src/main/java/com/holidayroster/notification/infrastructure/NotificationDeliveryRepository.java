package com.holidayroster.notification.infrastructure;

import com.holidayroster.notification.domain.NotificationDelivery;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Delivery attempts are append-only history; this interface intentionally exposes no update/delete methods. */
public interface NotificationDeliveryRepository extends Repository<NotificationDelivery, Long> {

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO notification_delivery (
                notification_outbox_id, channel_code, attempt_number, delivery_status,
                provider_message_reference, attempted_at_utc, failure_code, failure_summary, created_at_utc
            ) VALUES (
                :outboxId, :channelCode, :attemptNumber, :deliveryStatus,
                :providerMessageReference, :attemptedAtUtc, :failureCode, :failureSummary, :createdAtUtc
            )
            """, nativeQuery = true)
    int append(
            @Param("outboxId") Long outboxId,
            @Param("channelCode") String channelCode,
            @Param("attemptNumber") short attemptNumber,
            @Param("deliveryStatus") String deliveryStatus,
            @Param("providerMessageReference") String providerMessageReference,
            @Param("attemptedAtUtc") LocalDateTime attemptedAtUtc,
            @Param("failureCode") String failureCode,
            @Param("failureSummary") String failureSummary,
            @Param("createdAtUtc") LocalDateTime createdAtUtc);

    List<NotificationDelivery> findByNotificationOutbox_IdOrderByAttemptNumberAsc(Long notificationOutboxId);
}
