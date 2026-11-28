package com.holidayroster.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Objects;

/** Single-tenant organization identity/configuration row (the supported key is 1). */
@Entity
@Table(name = "organisation_setting")
public class OrganizationSetting {
    @Id
    private Long id;
    @Column(name = "organisation_name", nullable = false, length = 160)
    private String organizationName;
    @Column(name = "timezone_id", nullable = false, length = 64)
    private String timezoneId;
    @Column(name = "locale_code", nullable = false, length = 16)
    private String localeCode;
    @Column(name = "is_enabled", nullable = false)
    private boolean enabled;
    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;
    @Column(name = "updated_at_utc", nullable = false)
    private Instant updatedAtUtc;

    protected OrganizationSetting() { }

    public OrganizationSetting(String organizationName, String timezoneId, String localeCode, Instant now) {
        if (organizationName == null || organizationName.isBlank() || organizationName.trim().length() > 160) {
            throw new IllegalArgumentException("organizationName is required and must be at most 160 characters.");
        }
        ZoneId.of(Objects.requireNonNull(timezoneId, "timezoneId"));
        if (localeCode == null || localeCode.isBlank() || localeCode.trim().length() > 16) {
            throw new IllegalArgumentException("localeCode is required and must be at most 16 characters.");
        }
        this.id = 1L;
        this.organizationName = organizationName.trim();
        this.timezoneId = timezoneId;
        this.localeCode = localeCode.trim();
        this.enabled = true;
        this.createdAtUtc = Objects.requireNonNull(now, "now");
        this.updatedAtUtc = now;
    }

    public Long getId() { return id; }
    public String getOrganizationName() { return organizationName; }
    public String getTimezoneId() { return timezoneId; }
    public String getLocaleCode() { return localeCode; }
    public boolean isEnabled() { return enabled; }
}
