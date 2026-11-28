package com.holidayroster.audit.infrastructure;

import com.holidayroster.audit.domain.AuditEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Insert and query only. The runtime database principal is also denied UPDATE/DELETE on audit_event. */
public interface AuditEventRepository extends Repository<AuditEvent, Long> {

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO audit_event (
                actor_user_account_id, actor_type, action_code, target_type, target_id,
                occurred_at_utc, reason, correlation_id, before_reference, after_reference,
                source_module, created_at_utc
            ) VALUES (
                :actorUserAccountId, :actorType, :actionCode, :targetType, :targetId,
                :occurredAtUtc, :reason, :correlationId, :beforeReference, :afterReference,
                :sourceModule, :createdAtUtc
            )
            """, nativeQuery = true)
    int append(
            @Param("actorUserAccountId") Long actorUserAccountId,
            @Param("actorType") String actorType,
            @Param("actionCode") String actionCode,
            @Param("targetType") String targetType,
            @Param("targetId") Long targetId,
            @Param("occurredAtUtc") LocalDateTime occurredAtUtc,
            @Param("reason") String reason,
            @Param("correlationId") String correlationId,
            @Param("beforeReference") String beforeReference,
            @Param("afterReference") String afterReference,
            @Param("sourceModule") String sourceModule,
            @Param("createdAtUtc") LocalDateTime createdAtUtc);

    Optional<AuditEvent> findById(Long id);

    Optional<AuditEvent> findByCorrelationId(String correlationId);

    List<AuditEvent> findByTargetTypeAndTargetIdOrderByOccurredAtUtcAsc(String targetType, Long targetId);
}
