package com.holidayroster.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

/** Authentication identity. This entity does not itself enable authentication or provisioning. */
@Entity
@Table(name = "user_account", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_account_employee", columnNames = "employee_id"),
        @UniqueConstraint(name = "uq_user_account_username", columnNames = "username"),
        @UniqueConstraint(name = "uq_user_account_email", columnNames = "email")
})
public class UserAccount {
    public enum Status { ACTIVE, LOCKED, DISABLED, PENDING }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    @NotBlank @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String username;
    @NotBlank @Email @Size(max = 254)
    @Column(nullable = false, length = 254)
    private String email;
    @NotBlank @Size(max = 255)
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(name = "account_status", nullable = false, length = 20)
    private Status status;
    @Column(name = "last_login_at_utc")
    private Instant lastLoginAtUtc;
    @Column(name = "password_changed_at_utc")
    private Instant passwordChangedAtUtc;
    @Column(name = "failed_login_count", nullable = false, columnDefinition = "SMALLINT UNSIGNED")
    private int failedLoginCount;
    @Column(name = "locked_until_utc")
    private Instant lockedUntilUtc;
    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;
    @Column(name = "updated_at_utc", nullable = false)
    private Instant updatedAtUtc;

    protected UserAccount() { }

    public UserAccount(Long employeeId, String username, String email, String passwordHash, Instant now) {
        this.employeeId = Objects.requireNonNull(employeeId, "employeeId");
        this.username = required(username, "username", 100);
        this.email = required(email, "email", 254).toLowerCase(Locale.ROOT);
        this.passwordHash = required(passwordHash, "passwordHash", 255);
        this.status = Status.PENDING;
        this.createdAtUtc = Objects.requireNonNull(now, "now");
        this.updatedAtUtc = now;
    }

    private static String required(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " is required.");
        String normalized = value.trim();
        if (normalized.length() > maxLength) throw new IllegalArgumentException(field + " exceeds its maximum length.");
        return normalized;
    }

    public Long getId() { return id; }
    public Long getEmployeeId() { return employeeId; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Status getStatus() { return status; }
    public Instant getLastLoginAtUtc() { return lastLoginAtUtc; }
    public boolean isActive() { return status == Status.ACTIVE; }
    public void recordSuccessfulLogin(Instant now) {
        if (!isActive()) throw new IllegalStateException("Account is not active.");
        this.lastLoginAtUtc = Objects.requireNonNull(now, "now");
        this.failedLoginCount = 0;
        this.lockedUntilUtc = null;
        this.updatedAtUtc = now;
    }
}
