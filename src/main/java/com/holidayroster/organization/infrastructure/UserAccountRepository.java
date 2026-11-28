package com.holidayroster.organization.infrastructure;

import com.holidayroster.organization.domain.UserAccount;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/** Read-only access surface until account provisioning/authentication is implemented. */
public interface UserAccountRepository extends Repository<UserAccount, Long> {
    <S extends UserAccount> S save(S entity);
    Optional<UserAccount> findById(Long id);
    Optional<UserAccount> findByUsernameIgnoreCase(String username);
    Optional<UserAccount> findByEmailIgnoreCase(String email);
    Optional<UserAccount> findByEmployeeId(Long employeeId);
}
