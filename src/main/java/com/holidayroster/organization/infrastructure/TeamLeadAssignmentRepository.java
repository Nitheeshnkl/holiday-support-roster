package com.holidayroster.organization.infrastructure;

import com.holidayroster.organization.domain.TeamLeadAssignment;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;

/** Assignment history access with versioned writes; no delete operation is exposed. */
public interface TeamLeadAssignmentRepository extends Repository<TeamLeadAssignment, Long> {
    <S extends TeamLeadAssignment> S save(S assignment);
    List<TeamLeadAssignment> findByTeamIdOrderByValidFromDesc(Long teamId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TeamLeadAssignment a where a.teamId = :teamId order by a.validFrom")
    List<TeamLeadAssignment> findTeamHistoryForUpdate(@Param("teamId") Long teamId);

    Optional<TeamLeadAssignment> findById(Long id);
    Optional<TeamLeadAssignment> findByIdAndTeamId(Long id, Long teamId);

    @Query(value = """
            SELECT ura.valid_from AS validFrom, ura.valid_to AS validTo
              FROM user_role_assignment ura
              JOIN app_role r ON r.id = ura.role_id
              JOIN user_account ua ON ua.id = ura.user_account_id
             WHERE ua.employee_id = :employeeId AND r.role_code = 'TEAM_LEAD'
            """, nativeQuery = true)
    List<RoleInterval> findTeamLeadRoleIntervals(@Param("employeeId") Long employeeId);

    interface RoleInterval {
        LocalDate getValidFrom();
        LocalDate getValidTo();
    }
}
