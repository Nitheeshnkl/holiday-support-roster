package com.holidayroster.shared.security;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Fail-closed organization-scope gate for organization-wide endpoints. Authorities must be
 * populated by trusted server-side account/role/permission resolution, never request data.
 */
@Component("organizationAuthorization")
public class OrganizationAuthorization {
    public static final String ORGANIZATION_SCOPE = "SCOPE:ORG";
    public static final String ADMIN_ROLE = "ROLE_ADMIN";

    public boolean hasOrganizationPermission(Authentication authentication, String permission, boolean adminOnly) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        boolean permissionGranted = has(authorities, permission);
        boolean organizationScoped = has(authorities, ORGANIZATION_SCOPE);
        boolean requiredRolePresent = !adminOnly || has(authorities, ADMIN_ROLE);
        return permissionGranted && organizationScoped && requiredRolePresent;
    }

    public boolean hasPermission(Authentication authentication, String permission) {
        return authentication != null && authentication.isAuthenticated()
                && has(authentication.getAuthorities(), permission);
    }

    public boolean isOrganizationScoped(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated()
                && has(authentication.getAuthorities(), ORGANIZATION_SCOPE);
    }

    /** Scope authorities are resolved from trusted server-side role, relationship and grant data. */
    public Set<Long> teamScopes(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return Set.of();
        Set<Long> ids = new LinkedHashSet<>();
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if (value != null && value.startsWith("SCOPE:TEAM:")) {
                try { ids.add(Long.parseLong(value.substring("SCOPE:TEAM:".length()))); }
                catch (NumberFormatException ignored) { /* malformed scope fails closed */ }
            }
        }
        return Set.copyOf(ids);
    }

    public Long ownEmployeeId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if (value != null && value.startsWith("SCOPE:OWN:")) {
                try { return Long.parseLong(value.substring("SCOPE:OWN:".length())); }
                catch (NumberFormatException ignored) { return null; }
            }
        }
        return null;
    }

    private static boolean has(Collection<? extends GrantedAuthority> authorities, String expected) {
        return authorities.stream().anyMatch(authority -> expected.equals(authority.getAuthority()));
    }
}
