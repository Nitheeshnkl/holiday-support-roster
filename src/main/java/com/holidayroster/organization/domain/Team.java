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
import java.time.LocalDate;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "team")
public class Team {
    public enum Status { ACTIVE, INACTIVE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "team_code", nullable = false, unique = true, length = 40)
    private String code;
    @Column(name = "team_name", nullable = false, length = 160)
    private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;
    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;
    @Column(name = "valid_to")
    private LocalDate validTo;
    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;
    @Column(name = "updated_at_utc", nullable = false)
    private Instant updatedAtUtc;
    @Version @Column(name = "row_version", nullable = false)
    private long rowVersion;

    protected Team() {}
    public Team(String code, String name, LocalDate validFrom, Instant now) {
        this.code = required(code, "code", 40);
        this.name = required(name, "name", 160);
        this.validFrom = Objects.requireNonNull(validFrom, "validFrom");
        this.createdAtUtc = Objects.requireNonNull(now, "now"); this.updatedAtUtc = now;
    }
    private static String required(String value, String field, int maximum) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " is required.");
        String normalized = value.trim();
        if (normalized.length() > maximum) throw new IllegalArgumentException(field + " exceeds its maximum length.");
        return normalized;
    }
    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public Status getStatus() { return status; }
    public LocalDate getValidFrom() { return validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public long getRowVersion() { return rowVersion; }
    public void touch(Instant now) {
        Instant candidate = Objects.requireNonNull(now, "now");
        this.updatedAtUtc = candidate.isAfter(updatedAtUtc) ? candidate : updatedAtUtc.plusNanos(1_000);
    }
}
