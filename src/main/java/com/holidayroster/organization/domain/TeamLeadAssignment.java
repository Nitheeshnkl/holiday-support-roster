package com.holidayroster.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "team_lead_assignment")
public class TeamLeadAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "team_id", nullable = false) private Long teamId;
    @Column(name = "employee_id", nullable = false) private Long employeeId;
    @Column(name = "valid_from", nullable = false) private LocalDate validFrom;
    @Column(name = "valid_to") private LocalDate validTo;
    @Column(name = "is_primary_contact", nullable = false) private boolean primaryContact = true;
    // Nullable in storage solely to preserve legacy rows; new construction requires an actor.
    @Column(name = "assigned_by_user_account_id") private Long assignedByUserAccountId;
    @Column(name = "created_at_utc", nullable = false, updatable = false) private Instant createdAtUtc;
    @Version @Column(name = "row_version", nullable = false) private long rowVersion;

    protected TeamLeadAssignment() { }

    public TeamLeadAssignment(Long teamId, Long employeeId, LocalDate validFrom, LocalDate validTo,
                              Long assignedByUserAccountId, Instant createdAtUtc) {
        this.teamId = Objects.requireNonNull(teamId, "teamId");
        this.employeeId = Objects.requireNonNull(employeeId, "employeeId");
        this.validFrom = Objects.requireNonNull(validFrom, "validFrom");
        if (validTo != null && validTo.isBefore(validFrom)) {
            throw new IllegalArgumentException("validTo must be on or after validFrom.");
        }
        this.validTo = validTo;
        this.assignedByUserAccountId = Objects.requireNonNull(assignedByUserAccountId, "assignedByUserAccountId");
        this.createdAtUtc = Objects.requireNonNull(createdAtUtc, "createdAtUtc");
    }

    /** Close the inclusive assignment interval; the use case must append its audit event in the same transaction. */
    public void closeOn(LocalDate effectiveTo) {
        Objects.requireNonNull(effectiveTo, "effectiveTo");
        if (effectiveTo.isBefore(validFrom) || (validTo != null && effectiveTo.isAfter(validTo))) {
            throw new IllegalArgumentException("effectiveTo must be within the existing assignment interval.");
        }
        this.validTo = effectiveTo;
    }

    /** Change an interval only from an explicitly authorized correction use case with audit append in its transaction. */
    public void correctPeriod(LocalDate effectiveFrom, LocalDate effectiveTo) {
        Objects.requireNonNull(effectiveFrom, "effectiveFrom");
        if (effectiveTo != null && effectiveTo.isBefore(effectiveFrom)) {
            throw new IllegalArgumentException("effectiveTo must be on or after effectiveFrom.");
        }
        this.validFrom = effectiveFrom;
        this.validTo = effectiveTo;
    }

    public Long getId() { return id; }
    public Long getTeamId() { return teamId; }
    public Long getEmployeeId() { return employeeId; }
    public LocalDate getValidFrom() { return validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public Long getAssignedByUserAccountId() { return assignedByUserAccountId; }
    public long getRowVersion() { return rowVersion; }
}
