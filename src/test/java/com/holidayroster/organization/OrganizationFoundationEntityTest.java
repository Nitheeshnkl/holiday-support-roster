package com.holidayroster.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.holidayroster.organization.domain.OrganizationSetting;
import com.holidayroster.organization.domain.UserAccount;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class OrganizationFoundationEntityTest {
    private static final Instant NOW = Instant.parse("2026-11-27T00:00:00Z");

    @Test
    void organizationSettingIsSingleTenantAndRequiresAnIanaTimezone() {
        var setting = new OrganizationSetting("Support", "Asia/Kolkata", "en", NOW);
        assertEquals(1L, setting.getId());
        assertEquals("Asia/Kolkata", setting.getTimezoneId());
        assertThrows(java.time.zone.ZoneRulesException.class,
                () -> new OrganizationSetting("Support", "Not/AZone", "en", NOW));
    }

    @Test
    void newAccountsArePendingAndStoreOnlyAProvidedHash() {
        var account = new UserAccount(5L, "support.user", "SUPPORT@example.test", "$2a$12$encoded-hash", NOW);
        assertEquals(UserAccount.Status.PENDING, account.getStatus());
        assertEquals("support@example.test", account.getEmail());
        assertEquals("$2a$12$encoded-hash", account.getPasswordHash());
        assertThrows(NullPointerException.class,
                () -> new UserAccount(null, "support.user", "support@example.test", "hash", NOW));
    }
}
