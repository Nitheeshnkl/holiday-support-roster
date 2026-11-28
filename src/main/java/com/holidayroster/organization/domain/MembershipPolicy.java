package com.holidayroster.organization.domain;

import java.time.LocalDate;
import java.util.Collection;

public final class MembershipPolicy {
    private MembershipPolicy() {}
    public static void requireNoOverlap(Collection<TeamMembership> existing, LocalDate from, LocalDate to) {
        if (from == null || (to != null && to.isBefore(from))) {
            throw new IllegalArgumentException("effectiveTo must be on or after effectiveFrom.");
        }
        LocalDate candidateEnd = to == null ? LocalDate.MAX : to;
        boolean overlaps = existing.stream().anyMatch(item -> {
            LocalDate existingEnd = item.getValidTo() == null ? LocalDate.MAX : item.getValidTo();
            return !item.getValidFrom().isAfter(candidateEnd) && !from.isAfter(existingEnd);
        });
        if (overlaps) throw new IllegalArgumentException("Employee already has a team membership during that period.");
    }
}
