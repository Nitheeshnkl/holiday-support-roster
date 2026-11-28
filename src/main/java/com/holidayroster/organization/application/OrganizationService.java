package com.holidayroster.organization.application;

import com.holidayroster.audit.infrastructure.AuditEventRepository;
import com.holidayroster.organization.domain.Employee;
import com.holidayroster.organization.domain.MembershipPolicy;
import com.holidayroster.organization.domain.Team;
import com.holidayroster.organization.domain.TeamLeadAssignment;
import com.holidayroster.organization.domain.TeamLeadAssignmentPolicy;
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
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Organization use cases. Scope is checked here as well as permission at the HTTP boundary. */
@Service
public class OrganizationService {
    private final TeamRepository teams;
    private final TeamMembershipRepository memberships;
    private final EmployeeRepository employees;
    private final TeamLeadAssignmentRepository teamLeads;
    private final UserAccountRepository accounts;
    private final AuditEventRepository audit;
    private final OrganizationAuthorization authorization;
    private final EntityManager entityManager;
    private final Clock clock;

    public OrganizationService(TeamRepository teams, TeamMembershipRepository memberships,
            EmployeeRepository employees, TeamLeadAssignmentRepository teamLeads,
            UserAccountRepository accounts, AuditEventRepository audit,
            OrganizationAuthorization authorization, EntityManager entityManager, Clock clock) {
        this.teams = teams;
        this.memberships = memberships;
        this.employees = employees;
        this.teamLeads = teamLeads;
        this.accounts = accounts;
        this.audit = audit;
        this.authorization = authorization;
        this.entityManager = entityManager;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Page<Employee> listEmployees(int page, int size, Boolean active, Authentication caller) {
        PageRequest pageable = PageRequest.of(page, size);
        if (authorization.isOrganizationScoped(caller)) {
            return active == null ? employees.findAll(pageable)
                    : employees.findByStatus(active ? Employee.Status.ACTIVE : Employee.Status.INACTIVE, pageable);
        }
        Long ownId = authorization.ownEmployeeId(caller);
        Set<Long> scopedTeams = authorization.teamScopes(caller);
        if (ownId == null && scopedTeams.isEmpty()) throw new AccessDeniedException("No employee scope is granted.");
        List<Long> visibleIds = new ArrayList<>();
        if (ownId != null) visibleIds.add(ownId);
        if (!scopedTeams.isEmpty()) {
            LocalDate today = LocalDate.now(clock);
            memberships.findByTeamIdIn(scopedTeams).stream()
                    .filter(m -> contains(m.getValidFrom(), m.getValidTo(), today))
                    .map(TeamMembership::getEmployeeId).forEach(visibleIds::add);
        }
        List<Long> ids = visibleIds.stream().distinct().toList();
        List<Employee> matching = employees.findByIdIn(ids).stream()
                .filter(e -> active == null || (e.getStatus() == Employee.Status.ACTIVE) == active)
                .toList();
        return slice(matching, page, size);
    }

    @Transactional
    public Employee createEmployee(String code, String firstName, String lastName, String email,
            LocalDate employmentStart, LocalDate employmentEnd, LocalDate eligibleFrom,
            LocalDate eligibleTo, Authentication caller) {
        requireOrg(caller, "ORG.USER.MANAGE", true);
        if (employees.existsByEmployeeCodeIgnoreCase(code.trim())) throw conflict("Employee code already exists.");
        if (employees.existsByWorkEmailIgnoreCase(email.trim())) throw conflict("Work email already exists.");
        Employee candidate;
        try {
            candidate = new Employee(code, firstName, lastName, email, employmentStart,
                    employmentEnd, eligibleFrom, eligibleTo, now());
        } catch (IllegalArgumentException exception) {
            throw validation(exception.getMessage());
        }
        Employee saved = employees.save(candidate);
        audit("EMPLOYEE_CREATED", "EMPLOYEE", saved.getId(), null,
                "employeeCode=" + saved.getEmployeeCode(), caller);
        return saved;
    }

    @Transactional(readOnly = true)
    public Employee getEmployee(Long employeeId, Authentication caller) {
        requireEmployeeScope(employeeId, caller, false);
        return employees.findById(employeeId).orElseThrow(() -> notFound("Employee not found."));
    }

    @Transactional
    public Employee updateEmployee(Long employeeId, String ifMatch, String code, String firstName,
            String lastName, String email, LocalDate employmentStart, LocalDate employmentEnd,
            LocalDate eligibleFrom, LocalDate eligibleTo, Authentication caller) {
        requireOrg(caller, "ORG.USER.MANAGE", true);
        Employee employee = employees.findByIdForUpdate(employeeId)
                .orElseThrow(() -> notFound("Employee not found."));
        requireVersion(ifMatch, employee.getRowVersion());
        if (!employee.getEmployeeCode().equalsIgnoreCase(code.trim())
                && employees.existsByEmployeeCodeIgnoreCase(code.trim())) throw conflict("Employee code already exists.");
        if (!employee.getWorkEmail().equalsIgnoreCase(email.trim())
                && employees.existsByWorkEmailIgnoreCase(email.trim())) throw conflict("Work email already exists.");
        String before = employeeReference(employee);
        try {
            employee.updateProfile(code, firstName, lastName, email, employmentStart, employmentEnd,
                    eligibleFrom, eligibleTo, now());
        } catch (IllegalArgumentException exception) {
            throw validation(exception.getMessage());
        }
        entityManager.flush();
        audit("EMPLOYEE_UPDATED", "EMPLOYEE", employeeId, before, employeeReference(employee), caller);
        return employee;
    }

    @Transactional(readOnly = true)
    public Page<Team> listTeams(int page, int size, Authentication caller) {
        if (authorization.isOrganizationScoped(caller)) return teams.findAll(PageRequest.of(page, size));
        Set<Long> ids = authorization.teamScopes(caller);
        if (ids.isEmpty()) throw new AccessDeniedException("No team scope is granted.");
        return teams.findByIdIn(ids, PageRequest.of(page, size));
    }

    @Transactional
    public Team createTeam(String code, String name, Authentication caller) {
        requireOrg(caller, "ORG.TEAM.MANAGE", true);
        if (teams.existsByCodeIgnoreCase(code.trim())) throw conflict("Team code already exists.");
        Team saved = teams.save(new Team(code, name, LocalDate.now(clock), now()));
        audit("TEAM_CREATED", "TEAM", saved.getId(), null,
                "code=" + saved.getCode() + ";name=" + saved.getName(), caller);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<TeamMembership> memberships(Long employeeId, Authentication caller) {
        requireEmployeeScope(employeeId, caller, true);
        employees.findById(employeeId).orElseThrow(() -> notFound("Employee not found."));
        return memberships.findByEmployeeIdOrderByValidFromDesc(employeeId);
    }

    @Transactional
    public TeamMembership addMembership(Long employeeId, Long teamId, LocalDate from, LocalDate to,
            Authentication caller) {
        requireOrg(caller, "ORG.MEMBERSHIP.MANAGE", true);
        if (!teams.existsById(teamId)) throw notFound("Team not found.");
        Employee employee = employees.findByIdForUpdate(employeeId)
                .orElseThrow(() -> notFound("Employee not found."));
        List<TeamMembership> history = memberships.findEmployeeHistoryForUpdate(employeeId);
        try {
            MembershipPolicy.requireNoOverlap(history, from, to);
            TeamMembership saved = memberships.save(new TeamMembership(employeeId, teamId, from, to, now()));
            audit("TEAM_MEMBERSHIP_CREATED", "TEAM_MEMBERSHIP", saved.getId(), null,
                    "employeeId=" + employee.getId() + ";teamId=" + teamId + ";from=" + from + ";to=" + to,
                    caller);
            return saved;
        } catch (IllegalArgumentException exception) {
            throw validation(exception.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public TeamLeadHistory teamLeadHistory(Long teamId, int page, int size, Authentication caller) {
        Team team = teams.findById(teamId).orElseThrow(() -> notFound("Team not found."));
        requirePermission(caller, "ORG.USER.READ");
        List<TeamLeadAssignment> rows = teamLeads.findByTeamIdOrderByValidFromDesc(teamId);
        if (!authorization.isOrganizationScoped(caller)) {
            Long ownId = authorization.ownEmployeeId(caller);
            boolean teamScoped = authorization.teamScopes(caller).contains(teamId);
            rows = rows.stream().filter(row -> teamScoped || (ownId != null && ownId.equals(row.getEmployeeId()))).toList();
            if (!teamScoped && (ownId == null || rows.isEmpty())) throw notFound("Team Lead history not found.");
        }
        return new TeamLeadHistory(slice(rows, page, size), team.getRowVersion());
    }

    @Transactional
    public TeamLeadMutation appointTeamLead(Long teamId, String ifMatch, Long employeeId,
            LocalDate from, Authentication caller) {
        requireOrg(caller, "ORG.TEAM_LEAD.MANAGE", true);
        Team team = lockTeam(teamId);
        requireVersion(ifMatch, team.getRowVersion());
        List<TeamLeadAssignment> history = teamLeads.findTeamHistoryForUpdate(teamId);
        try {
            TeamLeadAssignmentPolicy.requireNoTeamOverlap(history, teamId, from, null);
            requireTeamLeadEligibility(employeeId, teamId, from, null);
        } catch (IllegalArgumentException exception) { throw validation(exception.getMessage()); }
        TeamLeadAssignment saved = teamLeads.save(new TeamLeadAssignment(teamId, employeeId, from, null,
                actorId(caller), now()));
        team.touch(now());
        entityManager.flush();
        audit("TEAM_LEAD_APPOINTED", "TEAM_LEAD_ASSIGNMENT", saved.getId(), null,
                assignmentReference(saved), caller);
        return new TeamLeadMutation(saved, team.getRowVersion());
    }

    @Transactional
    public TeamLeadMutation replaceTeamLead(Long teamId, Long assignmentId, String ifMatch,
            Long employeeId, LocalDate effectiveFrom, Authentication caller) {
        requireOrg(caller, "ORG.TEAM_LEAD.MANAGE", true);
        Team team = lockTeam(teamId);
        requireVersion(ifMatch, team.getRowVersion());
        List<TeamLeadAssignment> history = teamLeads.findTeamHistoryForUpdate(teamId);
        TeamLeadAssignment predecessor = history.stream().filter(a -> a.getId().equals(assignmentId))
                .findFirst().orElseThrow(() -> notFound("Team Lead assignment not found."));
        if (!effectiveFrom.isAfter(predecessor.getValidFrom())
                || (predecessor.getValidTo() != null && effectiveFrom.isAfter(predecessor.getValidTo()))) {
            throw validation("Replacement date must fall after the predecessor start and within its interval.");
        }
        String before = assignmentReference(predecessor);
        predecessor.closeOn(effectiveFrom.minusDays(1));
        try {
            TeamLeadAssignmentPolicy.requireNoTeamOverlap(history.stream().filter(a -> a != predecessor).toList(),
                    teamId, effectiveFrom, null);
            requireTeamLeadEligibility(employeeId, teamId, effectiveFrom, null);
        } catch (IllegalArgumentException exception) { throw validation(exception.getMessage()); }
        TeamLeadAssignment successor = teamLeads.save(new TeamLeadAssignment(teamId, employeeId, effectiveFrom,
                null, actorId(caller), now()));
        team.touch(now());
        entityManager.flush();
        audit("TEAM_LEAD_REPLACED", "TEAM_LEAD_ASSIGNMENT", successor.getId(), before,
                "predecessor=" + assignmentReference(predecessor) + ";successor=" + assignmentReference(successor), caller);
        return new TeamLeadMutation(successor, team.getRowVersion());
    }

    @Transactional
    public TeamLeadAssignment terminateTeamLead(Long teamId, Long assignmentId, String ifMatch,
            LocalDate effectiveTo, Authentication caller) {
        requireOrg(caller, "ORG.TEAM_LEAD.MANAGE", true);
        Team team = lockTeam(teamId);
        List<TeamLeadAssignment> history = teamLeads.findTeamHistoryForUpdate(teamId);
        TeamLeadAssignment assignment = history.stream().filter(a -> a.getId().equals(assignmentId))
                .findFirst().orElseThrow(() -> notFound("Team Lead assignment not found."));
        requireVersion(ifMatch, assignment.getRowVersion());
        String before = assignmentReference(assignment);
        try { assignment.closeOn(effectiveTo); }
        catch (IllegalArgumentException exception) { throw validation(exception.getMessage()); }
        team.touch(now());
        entityManager.flush();
        audit("TEAM_LEAD_TERMINATED", "TEAM_LEAD_ASSIGNMENT", assignmentId, before,
                assignmentReference(assignment), caller);
        return assignment;
    }

    @Transactional
    public TeamLeadAssignment correctTeamLead(Long teamId, Long assignmentId, String ifMatch,
            LocalDate from, LocalDate to, Authentication caller) {
        requireOrg(caller, "ORG.TEAM_LEAD.MANAGE", true);
        Team team = lockTeam(teamId);
        List<TeamLeadAssignment> history = teamLeads.findTeamHistoryForUpdate(teamId);
        TeamLeadAssignment assignment = history.stream().filter(a -> a.getId().equals(assignmentId))
                .findFirst().orElseThrow(() -> notFound("Team Lead assignment not found."));
        requireVersion(ifMatch, assignment.getRowVersion());
        if (assignment.getValidTo() == null || !assignment.getValidTo().isBefore(LocalDate.now(clock))) {
            throw validation("Only a closed historical Team Lead assignment can be corrected.");
        }
        String before = assignmentReference(assignment);
        try {
            TeamLeadAssignmentPolicy.requireNoTeamOverlap(history.stream().filter(a -> a != assignment).toList(),
                    teamId, from, to);
            assignment.correctPeriod(from, to);
        } catch (IllegalArgumentException exception) { throw validation(exception.getMessage()); }
        team.touch(now());
        entityManager.flush();
        audit("TEAM_LEAD_HISTORY_CORRECTED", "TEAM_LEAD_ASSIGNMENT", assignmentId, before,
                assignmentReference(assignment), caller);
        return assignment;
    }

    private void requireTeamLeadEligibility(Long employeeId, Long teamId, LocalDate from, LocalDate to) {
        Employee employee = employees.findByIdForUpdate(employeeId)
                .orElseThrow(() -> notFound("Employee not found."));
        List<TeamLeadAssignmentPolicy.EffectiveInterval> roleIntervals = teamLeads
                .findTeamLeadRoleIntervals(employeeId).stream()
                .map(i -> new TeamLeadAssignmentPolicy.EffectiveInterval(i.getValidFrom(), i.getValidTo())).toList();
        List<TeamLeadAssignmentPolicy.EffectiveInterval> membershipIntervals = memberships
                .findByEmployeeIdOrderByValidFromDesc(employeeId).stream()
                .filter(m -> m.getTeamId().equals(teamId))
                .map(m -> new TeamLeadAssignmentPolicy.EffectiveInterval(m.getValidFrom(), m.getValidTo())).toList();
        TeamLeadAssignmentPolicy.requireEligibleThroughout(roleIntervals, membershipIntervals, from, to);
    }

    private Team lockTeam(Long id) {
        return teams.findByIdForUpdate(id).orElseThrow(() -> notFound("Team not found."));
    }

    private void requireEmployeeScope(Long employeeId, Authentication caller, boolean includeHistory) {
        if (authorization.isOrganizationScoped(caller) || Objects.equals(authorization.ownEmployeeId(caller), employeeId)) return;
        Set<Long> teamIds = authorization.teamScopes(caller);
        if (teamIds.isEmpty()) throw notFound("Employee not found.");
        LocalDate today = LocalDate.now(clock);
        boolean visible = memberships.findByEmployeeIdOrderByValidFromDesc(employeeId).stream()
                .anyMatch(m -> teamIds.contains(m.getTeamId())
                        && (includeHistory || contains(m.getValidFrom(), m.getValidTo(), today)));
        if (!visible) throw notFound("Employee not found.");
    }

    private void requireOrg(Authentication caller, String permission, boolean admin) {
        if (!authorization.hasOrganizationPermission(caller, permission, admin)) {
            throw new AccessDeniedException("Organization permission and scope are required.");
        }
    }

    private void requirePermission(Authentication caller, String permission) {
        if (!authorization.hasPermission(caller, permission)) throw new AccessDeniedException("Permission is required.");
    }

    private Long actorId(Authentication caller) {
        return accounts.findByUsernameIgnoreCase(caller.getName()).map(a -> a.getId())
                .orElseThrow(() -> new AccessDeniedException("Authenticated account attribution is unavailable."));
    }

    private void audit(String action, String type, Long targetId, String before, String after,
            Authentication caller) {
        Long actor = actorId(caller);
        LocalDateTime timestamp = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        audit.append(actor, "USER", action, type, targetId, timestamp, null, null,
                truncate(before, 255), truncate(after, 255), "ORGANIZATION", timestamp);
    }

    private static String employeeReference(Employee employee) {
        return "employeeCode=" + employee.getEmployeeCode() + ";rowVersion=" + employee.getRowVersion();
    }
    private static String assignmentReference(TeamLeadAssignment assignment) {
        return "employeeId=" + assignment.getEmployeeId() + ";from=" + assignment.getValidFrom()
                + ";to=" + assignment.getValidTo() + ";rowVersion=" + assignment.getRowVersion();
    }
    private static String truncate(String value, int size) { return value == null || value.length() <= size ? value : value.substring(0, size); }
    public static String etag(long version) { return "\"" + version + "\""; }
    private void requireVersion(String supplied, long actual) {
        if (!etag(actual).equals(supplied)) throw conflict("If-Match version is stale.");
    }
    private Instant now() { return clock.instant(); }
    private static boolean contains(LocalDate from, LocalDate to, LocalDate date) {
        return !date.isBefore(from) && (to == null || !date.isAfter(to));
    }
    private static <T> Page<T> slice(List<T> values, int page, int size) {
        int start = (int) Math.min((long) page * size, values.size());
        int end = (int) Math.min((long) start + size, values.size());
        return new PageImpl<>(values.subList(start, end), PageRequest.of(page, size), values.size());
    }
    private static InvalidOrganizationState conflict(String message) { return new InvalidOrganizationState(message); }
    private static OrganizationValidationException validation(String message) { return new OrganizationValidationException(message); }
    private static OrganizationNotFound notFound(String message) { return new OrganizationNotFound(message); }

    public record TeamLeadHistory(Page<TeamLeadAssignment> page, long collectionVersion) { }
    public record TeamLeadMutation(TeamLeadAssignment assignment, long collectionVersion) { }
    public static class InvalidOrganizationState extends RuntimeException { public InvalidOrganizationState(String message) { super(message); } }
    public static class OrganizationValidationException extends RuntimeException { public OrganizationValidationException(String message) { super(message); } }
    public static class OrganizationNotFound extends RuntimeException { public OrganizationNotFound(String message) { super(message); } }
}
