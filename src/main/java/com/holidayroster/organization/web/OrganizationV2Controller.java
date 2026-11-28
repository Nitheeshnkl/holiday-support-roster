package com.holidayroster.organization.web;

import com.holidayroster.organization.application.OrganizationService;
import com.holidayroster.organization.domain.Employee;
import com.holidayroster.organization.domain.Team;
import com.holidayroster.organization.domain.TeamLeadAssignment;
import com.holidayroster.organization.domain.TeamMembership;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** API v2 organization operations. Request/response records intentionally mirror OpenAPI schemas. */
@Validated
@RestController
@RequestMapping("/api/v2")
public class OrganizationV2Controller {
    private final OrganizationService service;
    public OrganizationV2Controller(OrganizationService service) { this.service = service; }

    @GetMapping("/employees")
    @PreAuthorize("@organizationAuthorization.hasPermission(authentication, 'ORG.USER.READ')")
    public EmployeePage listEmployees(@RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int pageSize,
            @RequestParam(required = false) Boolean active, Authentication authentication) {
        Page<Employee> result = service.listEmployees(page, pageSize, active, authentication);
        return new EmployeePage(result.getContent().stream().map(EmployeeView::from).toList(), PageMeta.from(result));
    }

    @PostMapping("/employees")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.USER.MANAGE', true)")
    public EmployeeView createEmployee(@Valid @RequestBody EmployeeInput input, Authentication authentication) {
        return EmployeeView.from(service.createEmployee(input.employeeCode(), input.firstName(), input.lastName(),
                input.workEmail(), input.employmentStartDate(), input.employmentEndDate(),
                input.rotationEligibleFrom(), input.rotationEligibleTo(), authentication));
    }

    @GetMapping("/employees/{employeeId}")
    @PreAuthorize("@organizationAuthorization.hasPermission(authentication, 'ORG.USER.READ')")
    public ResponseEntity<EmployeeView> getEmployee(@PathVariable Long employeeId, Authentication authentication) {
        Employee employee = service.getEmployee(employeeId, authentication);
        return ResponseEntity.ok().eTag(OrganizationService.etag(employee.getRowVersion())).body(EmployeeView.from(employee));
    }

    @PatchMapping("/employees/{employeeId}")
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.USER.MANAGE', true)")
    public ResponseEntity<EmployeeView> updateEmployee(@PathVariable Long employeeId,
            @RequestHeader("If-Match") String ifMatch, @Valid @RequestBody EmployeeInput input,
            Authentication authentication) {
        Employee employee = service.updateEmployee(employeeId, ifMatch, input.employeeCode(), input.firstName(),
                input.lastName(), input.workEmail(), input.employmentStartDate(), input.employmentEndDate(),
                input.rotationEligibleFrom(), input.rotationEligibleTo(), authentication);
        return ResponseEntity.ok().eTag(OrganizationService.etag(employee.getRowVersion())).body(EmployeeView.from(employee));
    }

    @GetMapping("/teams")
    @PreAuthorize("@organizationAuthorization.hasPermission(authentication, 'ORG.USER.READ')")
    public TeamPage listTeams(@RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int pageSize, Authentication authentication) {
        Page<Team> result = service.listTeams(page, pageSize, authentication);
        return new TeamPage(result.getContent().stream().map(TeamView::from).toList(), PageMeta.from(result));
    }

    @PostMapping("/teams")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.TEAM.MANAGE', true)")
    public TeamView createTeam(@Valid @RequestBody TeamInput input, Authentication authentication) {
        return TeamView.from(service.createTeam(input.code(), input.name(), authentication));
    }

    @GetMapping("/employees/{employeeId}/team-memberships")
    @PreAuthorize("@organizationAuthorization.hasPermission(authentication, 'ORG.USER.READ')")
    public MembershipList listMemberships(@PathVariable Long employeeId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int pageSize, Authentication authentication) {
        List<TeamMembershipView> all = service.memberships(employeeId, authentication).stream()
                .map(TeamMembershipView::from).toList();
        Page<TeamMembershipView> result = page(all, page, pageSize);
        return new MembershipList(result.getContent(), PageMeta.from(result));
    }

    @PostMapping("/employees/{employeeId}/team-memberships")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.MEMBERSHIP.MANAGE', true)")
    public TeamMembershipView createMembership(@PathVariable Long employeeId,
            @Valid @RequestBody TeamMembershipInput input, Authentication authentication) {
        return TeamMembershipView.from(service.addMembership(employeeId, input.teamId(), input.effectiveFrom(),
                input.effectiveTo(), authentication));
    }

    @GetMapping("/teams/{teamId}/team-lead-assignments")
    @PreAuthorize("@organizationAuthorization.hasPermission(authentication, 'ORG.USER.READ')")
    public ResponseEntity<TeamLeadAssignmentList> listTeamLeadAssignments(@PathVariable Long teamId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int pageSize, Authentication authentication) {
        OrganizationService.TeamLeadHistory history = service.teamLeadHistory(teamId, page, pageSize, authentication);
        return ResponseEntity.ok().eTag(OrganizationService.etag(history.collectionVersion()))
                .body(new TeamLeadAssignmentList(history.page().getContent().stream()
                        .map(TeamLeadAssignmentView::from).toList(), PageMeta.from(history.page())));
    }

    @PostMapping("/teams/{teamId}/team-lead-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.TEAM_LEAD.MANAGE', true)")
    public ResponseEntity<TeamLeadAssignmentView> assignTeamLead(@PathVariable Long teamId,
            @RequestHeader("If-Match") String ifMatch, @Valid @RequestBody TeamLeadAssignmentInput input,
            Authentication authentication) {
        OrganizationService.TeamLeadMutation result = service.appointTeamLead(teamId, ifMatch,
                input.employeeId(), input.effectiveFrom(), authentication);
        return ResponseEntity.status(HttpStatus.CREATED).eTag(OrganizationService.etag(result.collectionVersion()))
                .body(TeamLeadAssignmentView.from(result.assignment()));
    }

    @PostMapping("/teams/{teamId}/team-lead-assignments/{assignmentId}/replacement")
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.TEAM_LEAD.MANAGE', true)")
    public ResponseEntity<TeamLeadAssignmentView> replaceTeamLead(@PathVariable Long teamId,
            @PathVariable Long assignmentId, @RequestHeader("If-Match") String ifMatch,
            @Valid @RequestBody TeamLeadReplacementInput input, Authentication authentication) {
        OrganizationService.TeamLeadMutation result = service.replaceTeamLead(teamId, assignmentId, ifMatch,
                input.employeeId(), input.effectiveFrom(), authentication);
        return ResponseEntity.ok().eTag(OrganizationService.etag(result.collectionVersion()))
                .body(TeamLeadAssignmentView.from(result.assignment()));
    }

    @PostMapping("/teams/{teamId}/team-lead-assignments/{assignmentId}/terminate")
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.TEAM_LEAD.MANAGE', true)")
    public ResponseEntity<TeamLeadAssignmentView> terminateTeamLead(@PathVariable Long teamId,
            @PathVariable Long assignmentId, @RequestHeader("If-Match") String ifMatch,
            @Valid @RequestBody TeamLeadTerminationInput input, Authentication authentication) {
        TeamLeadAssignment assignment = service.terminateTeamLead(teamId, assignmentId, ifMatch,
                input.effectiveTo(), authentication);
        return ResponseEntity.ok().eTag(OrganizationService.etag(assignment.getRowVersion()))
                .body(TeamLeadAssignmentView.from(assignment));
    }

    @PatchMapping("/teams/{teamId}/team-lead-assignments/{assignmentId}")
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.TEAM_LEAD.MANAGE', true)")
    public ResponseEntity<TeamLeadAssignmentView> correctTeamLead(@PathVariable Long teamId,
            @PathVariable Long assignmentId, @RequestHeader("If-Match") String ifMatch,
            @Valid @RequestBody TeamLeadCorrectionInput input, Authentication authentication) {
        TeamLeadAssignment assignment = service.correctTeamLead(teamId, assignmentId, ifMatch,
                input.effectiveFrom(), input.effectiveTo(), authentication);
        return ResponseEntity.ok().eTag(OrganizationService.etag(assignment.getRowVersion()))
                .body(TeamLeadAssignmentView.from(assignment));
    }

    private static <T> Page<T> page(List<T> values, int number, int size) {
        int start = Math.min(number * size, values.size());
        int end = Math.min(start + size, values.size());
        return new org.springframework.data.domain.PageImpl<>(values.subList(start, end),
                org.springframework.data.domain.PageRequest.of(number, size), values.size());
    }

    public record EmployeeInput(@NotBlank @Size(max=40) String employeeCode,
            @NotBlank @Size(max=100) String firstName, @NotBlank @Size(max=100) String lastName,
            @NotBlank @Email @Size(max=254) String workEmail, @NotNull LocalDate employmentStartDate,
            LocalDate employmentEndDate, LocalDate rotationEligibleFrom, LocalDate rotationEligibleTo) { }
    public record EmployeeView(Long id, String employeeCode, String firstName, String lastName, String displayName,
            String workEmail, LocalDate employmentStartDate, LocalDate employmentEndDate,
            LocalDate rotationEligibleFrom, LocalDate rotationEligibleTo, boolean active, long rowVersion) {
        static EmployeeView from(Employee e) { return new EmployeeView(e.getId(), e.getEmployeeCode(), e.getFirstName(),
                e.getLastName(), e.getDisplayName(), e.getWorkEmail(), e.getEmploymentStartDate(),
                e.getEmploymentEndDate(), e.getRotationEligibleFrom(), e.getRotationEligibleTo(),
                e.getStatus() == Employee.Status.ACTIVE, e.getRowVersion()); }
    }
    public record EmployeePage(List<EmployeeView> items, PageMeta page) { }
    public record TeamInput(@NotBlank @Size(max=40) String code, @NotBlank @Size(max=120) String name) { }
    public record TeamView(Long id, String code, String name, boolean active) {
        static TeamView from(Team t) { return new TeamView(t.getId(), t.getCode(), t.getName(), t.getStatus() == Team.Status.ACTIVE); }
    }
    public record TeamPage(List<TeamView> items, PageMeta page) { }
    public record TeamMembershipInput(@NotNull Long teamId, @NotNull LocalDate effectiveFrom, LocalDate effectiveTo) { }
    public record TeamMembershipView(Long id, Long employeeId, Long teamId, LocalDate effectiveFrom,
            LocalDate effectiveTo, String status) {
        static TeamMembershipView from(TeamMembership m) { return new TeamMembershipView(m.getId(), m.getEmployeeId(),
                m.getTeamId(), m.getValidFrom(), m.getValidTo(), m.getStatus().name()); }
    }
    public record MembershipList(List<TeamMembershipView> items, PageMeta page) { }
    public record TeamLeadAssignmentInput(@NotNull Long employeeId, @NotNull LocalDate effectiveFrom) { }
    public record TeamLeadReplacementInput(@NotNull Long employeeId, @NotNull LocalDate effectiveFrom) { }
    public record TeamLeadTerminationInput(@NotNull LocalDate effectiveTo) { }
    public record TeamLeadCorrectionInput(@NotNull LocalDate effectiveFrom, LocalDate effectiveTo) { }
    public record TeamLeadAssignmentView(Long id, Long teamId, Long employeeId, LocalDate effectiveFrom,
            LocalDate effectiveTo, Long assignedByUserAccountId, long rowVersion) {
        static TeamLeadAssignmentView from(TeamLeadAssignment a) { return new TeamLeadAssignmentView(a.getId(),
                a.getTeamId(), a.getEmployeeId(), a.getValidFrom(), a.getValidTo(),
                a.getAssignedByUserAccountId(), a.getRowVersion()); }
    }
    public record TeamLeadAssignmentList(List<TeamLeadAssignmentView> items, PageMeta page) { }
    public record PageMeta(int number, int size, long totalElements, int totalPages) {
        static PageMeta from(Page<?> p) { return new PageMeta(p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages()); }
    }
}
