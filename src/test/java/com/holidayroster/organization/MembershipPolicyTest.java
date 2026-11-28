package com.holidayroster.organization;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.holidayroster.organization.domain.MembershipPolicy;
import com.holidayroster.organization.domain.TeamMembership;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class MembershipPolicyTest {
    private static final Instant NOW = Instant.parse("2026-11-27T00:00:00Z");

    @Test void permitsAdjacentMembershipIntervals() {
        TeamMembership prior = new TeamMembership(1L, 10L,
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-06-30"), NOW);
        assertDoesNotThrow(() -> MembershipPolicy.requireNoOverlap(List.of(prior),
                LocalDate.parse("2026-07-01"), null));
    }

    @Test void rejectsOverlappingAndOpenEndedIntervals() {
        TeamMembership prior = new TeamMembership(1L, 10L,
                LocalDate.parse("2026-01-01"), null, NOW);
        assertThrows(IllegalArgumentException.class, () -> MembershipPolicy.requireNoOverlap(List.of(prior),
                LocalDate.parse("2026-07-01"), null));
    }

    @Test void rejectsEndBeforeStart() {
        assertThrows(IllegalArgumentException.class, () -> new TeamMembership(1L, 10L,
                LocalDate.parse("2026-07-02"), LocalDate.parse("2026-07-01"), NOW));
    }
}
