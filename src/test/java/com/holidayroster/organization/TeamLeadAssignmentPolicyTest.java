package com.holidayroster.organization;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.holidayroster.organization.domain.TeamLeadAssignment;
import com.holidayroster.organization.domain.TeamLeadAssignmentPolicy;
import com.holidayroster.organization.domain.TeamLeadAssignmentPolicy.EffectiveInterval;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import jakarta.persistence.Version;
import org.junit.jupiter.api.Test;

class TeamLeadAssignmentPolicyTest {
    private static final LocalDate START = LocalDate.parse("2026-01-01");
    private static final LocalDate END = LocalDate.parse("2026-01-31");
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void inclusiveIntervalsRejectSameDayOverlapAndAllowNextDayReplacement() {
        TeamLeadAssignment existing = new TeamLeadAssignment(7L, 10L, START, END, 1L, NOW);
        assertThrows(IllegalArgumentException.class, () -> TeamLeadAssignmentPolicy.requireNoTeamOverlap(
                List.of(existing), 7L, END, null));
        assertDoesNotThrow(() -> TeamLeadAssignmentPolicy.requireNoTeamOverlap(
                List.of(existing), 7L, END.plusDays(1), null));
        assertDoesNotThrow(() -> TeamLeadAssignmentPolicy.requireNoTeamOverlap(
                List.of(existing), 8L, START, null));
    }

    @Test
    void roleAndMembershipMustCoverTheFullInclusiveAssignmentPeriod() {
        List<EffectiveInterval> role = List.of(new EffectiveInterval(START, END));
        List<EffectiveInterval> membership = List.of(
                new EffectiveInterval(START, LocalDate.parse("2026-01-14")),
                new EffectiveInterval(LocalDate.parse("2026-01-15"), END));
        assertDoesNotThrow(() -> TeamLeadAssignmentPolicy.requireEligibleThroughout(role, membership, START, END));
        assertThrows(IllegalArgumentException.class, () -> TeamLeadAssignmentPolicy.requireEligibleThroughout(
                List.of(new EffectiveInterval(START, END.minusDays(1))), membership, START, END));
        assertThrows(IllegalArgumentException.class, () -> TeamLeadAssignmentPolicy.requireEligibleThroughout(
                role, List.of(new EffectiveInterval(START, END.minusDays(1))), START, END));
    }

    @Test
    void newAssignmentCannotOmitActorAttribution() {
        assertThrows(NullPointerException.class, () -> new TeamLeadAssignment(7L, 10L, START, END,
                null, NOW));
        assertThrows(IllegalArgumentException.class, () -> new TeamLeadAssignment(7L, 10L, END, START,
                1L, NOW));
    }

    @Test
    void intervalClosureAndCorrectionPreserveValidInclusiveBounds() {
        TeamLeadAssignment assignment = new TeamLeadAssignment(7L, 10L, START, null, 1L, NOW);
        assignment.closeOn(END);
        org.junit.jupiter.api.Assertions.assertEquals(END, assignment.getValidTo());
        assertThrows(IllegalArgumentException.class, () -> assignment.closeOn(END.plusDays(1)));
        assignment.correctPeriod(START.plusDays(1), END);
        org.junit.jupiter.api.Assertions.assertEquals(START.plusDays(1), assignment.getValidFrom());
    }

    @Test
    void assignmentCarriesJpaOptimisticVersion() throws Exception {
        var field = TeamLeadAssignment.class.getDeclaredField("rowVersion");
        org.junit.jupiter.api.Assertions.assertTrue(field.isAnnotationPresent(Version.class));
    }
}
