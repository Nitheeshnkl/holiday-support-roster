package com.holidayroster.notification.infrastructure;

import com.holidayroster.notification.domain.NotificationOutbox;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Explicit insert/read surface; notification intents cannot be deleted through this repository. */
public interface NotificationOutboxRepository extends Repository<NotificationOutbox, Long> {

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO notification_outbox (
                event_key, event_type, aggregate_type, aggregate_id,
                recipient_user_account_id, read_at_utc, recipient_address_snapshot,
                template_code, payload_text, delivery_status, attempt_count,
                next_attempt_at_utc, created_at_utc, updated_at_utc
            ) VALUES (
                :eventKey, :eventType, :aggregateType, :aggregateId,
                :recipientUserAccountId, :readAtUtc, :recipientAddressSnapshot,
                :templateCode, :payloadText, :deliveryStatus, :attemptCount,
                :nextAttemptAtUtc, :createdAtUtc, :updatedAtUtc
            )
            """, nativeQuery = true)
    int append(
            @Param("eventKey") String eventKey,
            @Param("eventType") String eventType,
            @Param("aggregateType") String aggregateType,
            @Param("aggregateId") Long aggregateId,
            @Param("recipientUserAccountId") Long recipientUserAccountId,
            @Param("readAtUtc") LocalDateTime readAtUtc,
            @Param("recipientAddressSnapshot") String recipientAddressSnapshot,
            @Param("templateCode") String templateCode,
            @Param("payloadText") String payloadText,
            @Param("deliveryStatus") String deliveryStatus,
            @Param("attemptCount") short attemptCount,
            @Param("nextAttemptAtUtc") LocalDateTime nextAttemptAtUtc,
            @Param("createdAtUtc") LocalDateTime createdAtUtc,
            @Param("updatedAtUtc") LocalDateTime updatedAtUtc);

    Optional<NotificationOutbox> findById(Long id);

    Optional<NotificationOutbox> findByEventKey(String eventKey);

    List<NotificationOutbox> findByRecipientUserAccountIdOrderByCreatedAtUtcDesc(Long recipientUserAccountId);

    List<NotificationOutbox> findByDeliveryStatusOrderByNextAttemptAtUtcAscIdAsc(String deliveryStatus);
}
