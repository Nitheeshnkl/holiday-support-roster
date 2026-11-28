package com.holidayroster.organization.infrastructure;

import com.holidayroster.organization.domain.Employee;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Collection;

public interface EmployeeRepository extends Repository<Employee, Long> {
    <S extends Employee> S save(S entity);
    Optional<Employee> findById(Long id);
    Page<Employee> findAll(Pageable pageable);
    Page<Employee> findByIdIn(Collection<Long> ids, Pageable pageable);
    java.util.List<Employee> findByIdIn(Collection<Long> ids);
    Page<Employee> findByStatus(Employee.Status status, Pageable pageable);
    Page<Employee> findByIdInAndStatus(Collection<Long> ids, Employee.Status status, Pageable pageable);
    Optional<Employee> findByIdAndStatus(Long id, Employee.Status status);
    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);
    boolean existsByWorkEmailIgnoreCase(String workEmail);
    @Query("select count(e) from Employee e where e.status = com.holidayroster.organization.domain.Employee.Status.ACTIVE and e.rotationEligibleFrom is not null and e.rotationEligibleFrom <= :date and (e.rotationEligibleTo is null or e.rotationEligibleTo >= :date)")
    long countActiveRotationEligibleOn(@Param("date") java.time.LocalDate date);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Employee e where e.id = :id")
    Optional<Employee> findByIdForUpdate(@Param("id") Long id);
}
