package com.holidayroster.organization.domain;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Pure effective-date invariants used by Team Lead appointment/replacement use cases. */
public final class TeamLeadAssignmentPolicy {
    private TeamLeadAssignmentPolicy() { }

    public record EffectiveInterval(LocalDate from, LocalDate to) {
        public EffectiveInterval {
            Objects.requireNonNull(from, "from");
            if (to != null && to.isBefore(from)) throw new IllegalArgumentException("Interval end precedes start.");
        }
    }

    public static void requireValidInterval(LocalDate from, LocalDate to) {
        new EffectiveInterval(from, to);
    }

    public static void requireNoTeamOverlap(
            Collection<TeamLeadAssignment> existing, Long teamId, LocalDate from, LocalDate to) {
        requireValidInterval(from, to);
        LocalDate candidateEnd = to == null ? LocalDate.MAX : to;
        boolean overlap = existing.stream()
                .filter(assignment -> Objects.equals(teamId, assignment.getTeamId()))
                .anyMatch(assignment -> intersects(from, candidateEnd, assignment.getValidFrom(),
                        assignment.getValidTo() == null ? LocalDate.MAX : assignment.getValidTo()));
        if (overlap) throw new IllegalArgumentException("Team Lead assignment overlaps an existing assignment.");
    }

    /** Requires one role interval and one membership interval to cover every inclusive day. */
    public static void requireEligibleThroughout(
            Collection<EffectiveInterval> teamLeadRoleIntervals,
            Collection<EffectiveInterval> teamMembershipIntervals,
            LocalDate from,
            LocalDate to) {
        requireValidInterval(from, to);
        if (!covers(teamLeadRoleIntervals, from, to) || !covers(teamMembershipIntervals, from, to)) {
            throw new IllegalArgumentException(
                    "Team Lead role and team membership must cover the complete assignment interval.");
        }
    }

    private static boolean covers(Collection<EffectiveInterval> intervals, LocalDate from, LocalDate to) {
        List<EffectiveInterval> ordered = intervals.stream()
                .sorted(Comparator.comparing(EffectiveInterval::from)).toList();
        LocalDate cursor = from;
        for (EffectiveInterval interval : ordered) {
            LocalDate end = interval.to() == null ? LocalDate.MAX : interval.to();
            if (interval.from().isAfter(cursor)) return false;
            if (end.isBefore(cursor)) continue;
            if ((to == null && interval.to() == null) || (to != null && !end.isBefore(to))) return true;
            if (end.equals(LocalDate.MAX)) return true;
            cursor = end.plusDays(1);
        }
        return false;
    }

    private static boolean intersects(LocalDate firstStart, LocalDate firstEnd,
                                      LocalDate secondStart, LocalDate secondEnd) {
        return !firstStart.isAfter(secondEnd) && !secondStart.isAfter(firstEnd);
    }
}
