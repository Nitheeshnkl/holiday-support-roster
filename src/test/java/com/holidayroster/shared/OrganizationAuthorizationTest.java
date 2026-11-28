package com.holidayroster.shared;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.holidayroster.shared.security.OrganizationAuthorization;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class OrganizationAuthorizationTest {
    private final OrganizationAuthorization policy = new OrganizationAuthorization();

    @Test
    void organizationOperationsRequirePermissionAndExplicitOrgScope() {
        var permissionOnly = authenticated("ORG.TEAM.MANAGE");
        var scopedAdmin = authenticated("ROLE_ADMIN", "ORG.TEAM.MANAGE", "SCOPE:ORG");
        assertFalse(policy.hasOrganizationPermission(permissionOnly, "ORG.TEAM.MANAGE", true));
        assertFalse(policy.hasOrganizationPermission(authenticated("ROLE_ADMIN", "ORG.TEAM.MANAGE"),
                "ORG.TEAM.MANAGE", true));
        assertFalse(policy.hasOrganizationPermission(authenticated("ORG.TEAM.MANAGE", "SCOPE:ORG"),
                "ORG.TEAM.MANAGE", true));
        assertTrue(policy.hasOrganizationPermission(scopedAdmin, "ORG.TEAM.MANAGE", true));
    }

    @Test
    void unauthenticatedAndUnauthenticatedTokenAreDenied() {
        assertFalse(policy.hasOrganizationPermission(null, "ORG.TEAM.MANAGE", true));
        var anonymous = new UsernamePasswordAuthenticationToken("anonymous", "", List.of());
        assertFalse(policy.hasOrganizationPermission(anonymous, "ORG.TEAM.MANAGE", true));
    }

    @Test
    void permissionAndResourceScopeRemainIndependent() {
        var permissionOnly = authenticated("ORG.USER.READ");
        assertTrue(policy.hasPermission(permissionOnly, "ORG.USER.READ"));
        assertFalse(policy.isOrganizationScoped(permissionOnly));
        assertTrue(policy.teamScopes(authenticated("SCOPE:TEAM:17")).contains(17L));
        assertEquals(17L, policy.ownEmployeeId(authenticated("SCOPE:OWN:17")));
        assertNull(policy.ownEmployeeId(authenticated("SCOPE:OWN:not-a-number")));
    }

    private static UsernamePasswordAuthenticationToken authenticated(String... authorities) {
        return UsernamePasswordAuthenticationToken.authenticated("trusted-test-user", "",
                java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList());
    }
}
