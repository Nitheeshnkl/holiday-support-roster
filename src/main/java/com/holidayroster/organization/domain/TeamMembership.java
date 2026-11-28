package com.holidayroster.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "team_membership")
public class TeamMembership {
    public enum Status { ACTIVE, ENDED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    @Column(name = "team_id", nullable = false)
    private Long teamId;
    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;
    @Column(name = "valid_to")
    private LocalDate validTo;
    @Enumerated(EnumType.STRING) @Column(name = "membership_status", nullable = false, length = 20)
    private Status status = Status.ACTIVE;
    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;
    @Column(name = "updated_at_utc", nullable = false)
    private Instant updatedAtUtc;
    @Version @Column(name = "row_version", nullable = false)
    private long rowVersion;

    protected TeamMembership() {}
    public TeamMembership(Long employeeId, Long teamId, LocalDate from, LocalDate to, Instant now) {
        this.employeeId = employeeId; this.teamId = teamId; this.validFrom = from;
        this.validTo = to; this.createdAtUtc = now; this.updatedAtUtc = now;
        if (to != null && to.isBefore(from)) throw new IllegalArgumentException("effectiveTo precedes effectiveFrom");
    }
    public Long getId() { return id; }
    public Long getEmployeeId() { return employeeId; }
    public Long getTeamId() { return teamId; }
    public LocalDate getValidFrom() { return validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public Status getStatus() { return status; }
}
