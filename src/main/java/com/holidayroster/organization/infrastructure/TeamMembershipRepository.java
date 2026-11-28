package com.holidayroster.organization.infrastructure;

import com.holidayroster.organization.domain.TeamMembership;
import java.util.List;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface TeamMembershipRepository extends Repository<TeamMembership, Long> {
    <S extends TeamMembership> S save(S entity);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from TeamMembership m where m.employeeId = :employeeId")
    List<TeamMembership> findEmployeeHistoryForUpdate(@Param("employeeId") Long employeeId);
    List<TeamMembership> findByEmployeeIdOrderByValidFromDesc(Long employeeId);
    List<TeamMembership> findByTeamIdIn(java.util.Collection<Long> teamIds);
    List<TeamMembership> findByTeamIdOrderByValidFromDesc(Long teamId);
}
