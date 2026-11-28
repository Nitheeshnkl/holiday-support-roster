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
import jakarta.persistence.Version;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/** Employee is a person record; account and role lifecycle are separate concerns. */
@Entity
@Table(name = "employee", uniqueConstraints = {
        @UniqueConstraint(name = "uq_employee_code", columnNames = "employee_code"),
        @UniqueConstraint(name = "uq_employee_work_email", columnNames = "work_email")
})
public class Employee {
    public enum Status { ACTIVE, INACTIVE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Size(max = 40)
    @Column(name = "employee_code", nullable = false, length = 40)
    private String employeeCode;
    @NotBlank @Size(max = 100)
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    @NotBlank @Size(max = 100)
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    @NotBlank @Email @Size(max = 254)
    @Column(name = "work_email", nullable = false, length = 254)
    private String workEmail;
    @Column(name = "employment_start_date", nullable = false)
    private LocalDate employmentStartDate;
    @Column(name = "employment_end_date")
    private LocalDate employmentEndDate;
    @Column(name = "rotation_eligible_from")
    private LocalDate rotationEligibleFrom;
    @Column(name = "rotation_eligible_to")
    private LocalDate rotationEligibleTo;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Status status;
    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;
    @Column(name = "updated_at_utc", nullable = false)
    private Instant updatedAtUtc;
    @Version @Column(name = "row_version", nullable = false)
    private long rowVersion;

    protected Employee() { }

    public Employee(String employeeCode, String firstName, String lastName, String workEmail,
                    LocalDate employmentStartDate, LocalDate employmentEndDate,
                    LocalDate rotationEligibleFrom, LocalDate rotationEligibleTo,
                    Instant now) {
        this.employeeCode = required(employeeCode, "employeeCode", 40);
        this.firstName = required(firstName, "firstName", 100);
        this.lastName = required(lastName, "lastName", 100);
        this.workEmail = required(workEmail, "workEmail", 254).toLowerCase(java.util.Locale.ROOT);
        this.employmentStartDate = Objects.requireNonNull(employmentStartDate, "employmentStartDate");
        if (employmentEndDate != null && employmentEndDate.isBefore(employmentStartDate)) {
            throw new IllegalArgumentException("employmentEndDate must not precede employmentStartDate.");
        }
        if (rotationEligibleTo != null && rotationEligibleFrom == null) {
            throw new IllegalArgumentException("rotationEligibleFrom is required when rotationEligibleTo is set.");
        }
        if (rotationEligibleFrom != null && rotationEligibleTo != null
                && rotationEligibleTo.isBefore(rotationEligibleFrom)) {
            throw new IllegalArgumentException("rotationEligibleTo must be on or after rotationEligibleFrom.");
        }
        this.employmentEndDate = employmentEndDate;
        this.rotationEligibleFrom = rotationEligibleFrom;
        this.rotationEligibleTo = rotationEligibleTo;
        this.status = Status.ACTIVE;
        this.createdAtUtc = Objects.requireNonNull(now, "now");
        this.updatedAtUtc = now;
    }

    private static String required(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " is required.");
        String normalized = value.trim();
        if (normalized.length() > maxLength) throw new IllegalArgumentException(field + " exceeds its maximum length.");
        return normalized;
    }

    public String getDisplayName() { return firstName + " " + lastName; }
    public boolean isRotationEligibleOn(LocalDate date) {
        Objects.requireNonNull(date, "date");
        return rotationEligibleFrom != null && !date.isBefore(rotationEligibleFrom)
                && (rotationEligibleTo == null || !date.isAfter(rotationEligibleTo));
    }
    public void updateProfile(String employeeCode, String firstName, String lastName, String workEmail,
                              LocalDate employmentStartDate, LocalDate employmentEndDate,
                              LocalDate rotationEligibleFrom, LocalDate rotationEligibleTo, Instant now) {
        if (!this.employmentStartDate.equals(employmentStartDate)) {
            throw new IllegalArgumentException("employmentStartDate is historical and cannot be changed.");
        }
        if (this.employmentEndDate != null && employmentEndDate == null) {
            throw new IllegalArgumentException("employmentEndDate cannot be cleared after it is recorded.");
        }
        Employee validated = new Employee(employeeCode, firstName, lastName, workEmail, employmentStartDate,
                employmentEndDate, rotationEligibleFrom, rotationEligibleTo, now);
        this.employeeCode = validated.employeeCode;
        this.firstName = validated.firstName;
        this.lastName = validated.lastName;
        this.workEmail = validated.workEmail;
        this.employmentEndDate = validated.employmentEndDate;
        this.rotationEligibleFrom = validated.rotationEligibleFrom;
        this.rotationEligibleTo = validated.rotationEligibleTo;
        this.updatedAtUtc = now;
    }
    public Long getId() { return id; }
    public String getEmployeeCode() { return employeeCode; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getWorkEmail() { return workEmail; }
    public LocalDate getEmploymentStartDate() { return employmentStartDate; }
    public LocalDate getEmploymentEndDate() { return employmentEndDate; }
    public LocalDate getRotationEligibleFrom() { return rotationEligibleFrom; }
    public LocalDate getRotationEligibleTo() { return rotationEligibleTo; }
    public Status getStatus() { return status; }
    public long getRowVersion() { return rowVersion; }
}
