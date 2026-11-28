package com.holidayroster.account.infrastructure;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Reads only effective assignments; authority is never inferred from a client request. */
public interface AccountAuthorityRepository extends Repository<com.holidayroster.organization.domain.UserAccount, Long> {
    @Query(value = """
            select distinct r.role_code from user_role_assignment ura
            join app_role r on r.id = ura.role_id
            where ura.user_account_id = :accountId and ura.valid_from <= current_date()
              and (ura.valid_to is null or ura.valid_to >= current_date())
            """, nativeQuery = true)
    List<String> effectiveRoleCodes(long accountId);

    @Query(value = """
            select distinct p.permission_code from user_role_assignment ura
            join role_permission rp on rp.role_id = ura.role_id
            join permission p on p.id = rp.permission_id
            where ura.user_account_id = :accountId and ura.valid_from <= current_date()
              and (ura.valid_to is null or ura.valid_to >= current_date())
            """, nativeQuery = true)
    List<String> effectivePermissionCodes(long accountId);

    @Query(value = """
            select distinct tla.team_id from team_lead_assignment tla
            where tla.employee_id = :employeeId and tla.valid_from <= current_date()
              and (tla.valid_to is null or tla.valid_to >= current_date())
            """, nativeQuery = true)
    List<Long> effectiveTeamLeadTeamIds(long employeeId);
}
