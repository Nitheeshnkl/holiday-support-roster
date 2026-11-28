package com.holidayroster.account.web;

import com.holidayroster.organization.infrastructure.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Session endpoints use persisted accounts and the server-side HttpSession only. */
@RestController
public class SessionController {
    private final AuthenticationManager authenticationManager;
    private final UserAccountRepository accounts;
    private final Clock clock;
    private final HttpSessionSecurityContextRepository contexts = new HttpSessionSecurityContextRepository();
    public SessionController(AuthenticationManager authenticationManager, UserAccountRepository accounts, Clock clock) { this.authenticationManager = authenticationManager; this.accounts = accounts; this.clock = clock; }
    @PostMapping({"/api/v1/session/login", "/api/v2/session/login"})
    @Transactional
    public SessionView login(@Valid @RequestBody LoginInput input, HttpServletRequest request, HttpServletResponse response, CsrfToken csrfToken) {
        Authentication authentication = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(input.username(), input.password()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        var account = accounts.findByUsernameIgnoreCase(authentication.getName()).orElseThrow();
        account.recordSuccessfulLogin(clock.instant());
        accounts.save(account);
        return SessionView.from(account.getId(), account.getEmployeeId(), account.getUsername(), authentication, csrfToken.getToken());
    }
    @PostMapping({"/api/v1/session/logout", "/api/v2/session/logout"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) { if (request.getSession(false) != null) request.getSession(false).invalidate(); SecurityContextHolder.clearContext(); }
    @GetMapping({"/api/v1/session/me", "/api/v2/session/me"})
    public SessionView me(Authentication authentication, CsrfToken csrfToken) {
        var account = accounts.findByUsernameIgnoreCase(authentication.getName()).orElseThrow();
        return SessionView.from(account.getId(), account.getEmployeeId(), account.getUsername(), authentication, csrfToken.getToken());
    }
    public record LoginInput(@NotBlank @Size(max = 255) String username, @NotBlank String password) { }
    public record CurrentUser(Long id, Long employeeId, String displayName, List<String> roles, List<String> permissions, List<String> scopes) { }
    public record SessionView(CurrentUser user, String csrfToken, Onboarding onboarding) {
        static SessionView from(Long id, Long employeeId, String username, Authentication auth, String token) {
            List<String> all = auth.getAuthorities().stream().map(a -> a.getAuthority()).sorted().toList();
            return new SessionView(new CurrentUser(id, employeeId, username, all.stream().filter(a -> a.startsWith("ROLE_")).toList(), all.stream().filter(a -> !a.startsWith("ROLE_") && !a.startsWith("SCOPE:")).toList(), all.stream().filter(a -> a.startsWith("SCOPE:")).toList()), token, new Onboarding(false));
        }
    }
    public record Onboarding(boolean completed) { }
}
