package com.holidayroster.organization.web;

import com.holidayroster.organization.application.OrganizationService;
import com.holidayroster.organization.domain.Team;
import com.holidayroster.organization.domain.TeamMembership;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class OrganizationController {
    private final OrganizationService service;
    public OrganizationController(OrganizationService service) { this.service = service; }

    @GetMapping("/teams")
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.USER.READ', false)")
    public TeamPage listTeams(@RequestParam(defaultValue = "0") @Min(0) int page,
                              @RequestParam(defaultValue = "25") @Min(1) int pageSize,
                              Authentication authentication) {
        Page<Team> result = service.listTeams(page, pageSize, authentication);
        return new TeamPage(result.getContent().stream().map(TeamView::from).toList(), meta(result));
    }

    @PostMapping("/teams")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.TEAM.MANAGE', true)")
    public TeamView createTeam(@Valid @RequestBody TeamInput input, Authentication authentication) {
        return TeamView.from(service.createTeam(input.code(), input.name(), authentication));
    }

    @GetMapping("/employees/{employeeId}/team-memberships")
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.USER.READ', false)")
    public MembershipList listMemberships(@PathVariable Long employeeId, Authentication authentication) {
        List<TeamMembershipView> items = service.memberships(employeeId, authentication).stream().map(TeamMembershipView::from).toList();
        return new MembershipList(items);
    }

    @PostMapping("/employees/{employeeId}/team-memberships")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@organizationAuthorization.hasOrganizationPermission(authentication, 'ORG.MEMBERSHIP.MANAGE', true)")
    public TeamMembershipView addMembership(@PathVariable Long employeeId, @Valid @RequestBody MembershipInput input,
                                            Authentication authentication) {
        return TeamMembershipView.from(service.addMembership(employeeId, input.teamId(), input.effectiveFrom(), input.effectiveTo(), authentication));
    }

    private static PageMeta meta(Page<?> page) { return new PageMeta(page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()); }
    /** API v1 compatibility contract; API v2 request DTOs enforce the approved 120 limit. */
    public record TeamInput(@NotBlank @Size(max = 40) String code, @NotBlank @Size(max = 160) String name) {}
    public record TeamView(Long id, String code, String name, boolean active) {
        static TeamView from(Team t) { return new TeamView(t.getId(), t.getCode(), t.getName(), t.getStatus() == Team.Status.ACTIVE); }
    }
    public record TeamPage(List<TeamView> items, PageMeta page) {}
    public record PageMeta(int number, int size, long totalElements, int totalPages) {}
    public record MembershipInput(@NotNull Long teamId, @NotNull LocalDate effectiveFrom, LocalDate effectiveTo) {}
    public record TeamMembershipView(Long id, Long employeeId, Long teamId, LocalDate effectiveFrom, LocalDate effectiveTo, String status) {
        static TeamMembershipView from(TeamMembership m) {
            return new TeamMembershipView(m.getId(), m.getEmployeeId(), m.getTeamId(), m.getValidFrom(), m.getValidTo(), m.getStatus().name());
        }
    }
    public record MembershipList(List<TeamMembershipView> items) {}
}
