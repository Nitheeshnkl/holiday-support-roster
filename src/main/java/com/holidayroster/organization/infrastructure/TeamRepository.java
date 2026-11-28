package com.holidayroster.organization.infrastructure;

import com.holidayroster.organization.domain.Team;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface TeamRepository extends Repository<Team, Long> {
    <S extends Team> S save(S entity);
    Page<Team> findAll(Pageable pageable);
    Page<Team> findByIdIn(java.util.Collection<Long> ids, Pageable pageable);
    Optional<Team> findById(Long id);
    boolean existsById(Long id);
    boolean existsByCodeIgnoreCase(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Team t where t.id = :id")
    Optional<Team> findByIdForUpdate(@Param("id") Long id);
}
