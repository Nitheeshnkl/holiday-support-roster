package com.holidayroster.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.holidayroster.audit.infrastructure.AuditEventRepository;
import com.holidayroster.organization.application.OrganizationService;
import com.holidayroster.organization.domain.Employee;
import com.holidayroster.organization.domain.TeamMembership;
import com.holidayroster.organization.infrastructure.EmployeeRepository;
import com.holidayroster.organization.infrastructure.TeamLeadAssignmentRepository;
import com.holidayroster.organization.infrastructure.TeamMembershipRepository;
import com.holidayroster.organization.infrastructure.TeamRepository;
import com.holidayroster.organization.infrastructure.UserAccountRepository;
import com.holidayroster.shared.security.OrganizationAuthorization;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceScopeTest {
    @Mock TeamRepository teams;
    @Mock TeamMembershipRepository memberships;
    @Mock EmployeeRepository employees;
    @Mock TeamLeadAssignmentRepository teamLeads;
    @Mock UserAccountRepository accounts;
    @Mock AuditEventRepository audit;
    @Mock EntityManager entityManager;

    OrganizationService service;
    private static final Instant NOW = Instant.parse("2026-11-27T00:00:00Z");

    @BeforeEach
    void setUp() {
        service = new OrganizationService(teams, memberships, employees, teamLeads, accounts, audit,
                new OrganizationAuthorization(), entityManager, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void employeeReadIsHiddenWhenCallerHasOwnScopeForAnotherEmployee() {
        var caller = authenticated("ORG.USER.READ", "SCOPE:OWN:20");
        assertThrows(OrganizationService.OrganizationNotFound.class, () -> service.getEmployee(21L, caller));
    }

    @Test
    void employeeReadAllowsMembershipWithinExplicitTeamScope() {
        var caller = authenticated("ORG.USER.READ", "SCOPE:TEAM:3");
        when(memberships.findByEmployeeIdOrderByValidFromDesc(21L)).thenReturn(List.of(
                new TeamMembership(21L, 3L, LocalDate.parse("2026-01-01"), null, NOW)));
        Employee employee = new Employee("E-21", "Sam", "Lee", "sam.lee@example.test",
                LocalDate.parse("2020-01-01"), null, null, null, NOW);
        when(employees.findById(21L)).thenReturn(Optional.of(employee));
        assertEquals("sam.lee@example.test", service.getEmployee(21L, caller).getWorkEmail());
    }

    private static UsernamePasswordAuthenticationToken authenticated(String... authorities) {
        return UsernamePasswordAuthenticationToken.authenticated("test-user", "",
                java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList());
    }
}
