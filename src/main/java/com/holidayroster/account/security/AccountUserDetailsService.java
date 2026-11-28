package com.holidayroster.account.security;

import com.holidayroster.organization.domain.UserAccount;
import com.holidayroster.organization.infrastructure.UserAccountRepository;
import com.holidayroster.account.infrastructure.AccountAuthorityRepository;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import java.util.ArrayList;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/** Resolves identities from persisted accounts only; roles remain deny-by-default until provisioned. */
public class AccountUserDetailsService implements UserDetailsService {
    private final ObjectProvider<UserAccountRepository> accounts;
    private final ObjectProvider<AccountAuthorityRepository> authorities;
    public AccountUserDetailsService(ObjectProvider<UserAccountRepository> accounts, ObjectProvider<AccountAuthorityRepository> authorities) { this.accounts = accounts; this.authorities = authorities; }
    @Override public UserDetails loadUserByUsername(String username) {
        UserAccountRepository repository = accounts.getIfAvailable();
        if (repository == null) throw new UsernameNotFoundException("Account authentication is not configured.");
        UserAccount account = repository.findByUsernameIgnoreCase(username)
                .or(() -> repository.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials."));
        if (!account.isActive()) throw new UsernameNotFoundException("Invalid credentials.");
        List<SimpleGrantedAuthority> resolved = new ArrayList<>();
        resolved.add(new SimpleGrantedAuthority("SCOPE:OWN:" + account.getEmployeeId()));
        AccountAuthorityRepository authorityRepository = authorities.getIfAvailable();
        if (authorityRepository != null) {
            List<String> roles = authorityRepository.effectiveRoleCodes(account.getId());
            roles.forEach(role -> resolved.add(new SimpleGrantedAuthority("ROLE_" + role)));
            authorityRepository.effectivePermissionCodes(account.getId()).forEach(permission -> resolved.add(new SimpleGrantedAuthority(permission)));
            if (roles.contains("ADMIN")) resolved.add(new SimpleGrantedAuthority("SCOPE:ORG"));
            authorityRepository.effectiveTeamLeadTeamIds(account.getEmployeeId()).forEach(team -> resolved.add(new SimpleGrantedAuthority("SCOPE:TEAM:" + team)));
        }
        return User.withUsername(account.getUsername()).password(account.getPasswordHash())
                .authorities(resolved)
                .build();
    }
}
