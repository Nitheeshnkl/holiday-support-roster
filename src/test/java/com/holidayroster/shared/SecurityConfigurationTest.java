package com.holidayroster.shared;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import com.holidayroster.shared.config.PasswordConfiguration;
import com.holidayroster.shared.config.SecurityConfiguration;
import com.holidayroster.organization.application.OrganizationService;
import com.holidayroster.organization.domain.Employee;
import com.holidayroster.organization.web.OrganizationV2Controller;
import com.holidayroster.audit.infrastructure.AuditEventRepository;
import com.holidayroster.notification.infrastructure.NotificationDeliveryRepository;
import com.holidayroster.notification.infrastructure.NotificationOutboxRepository;
import com.holidayroster.shared.web.ApiExceptionHandler;
import com.holidayroster.shared.web.CorrelationIdFilter;
import com.holidayroster.shared.web.CsrfTokenController;
import tools.jackson.databind.json.JsonMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Autowired;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.Arrays;

@SpringBootTest(
        classes = SecurityConfigurationTest.TestApplication.class,
        properties = {
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                        + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                        + "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration",
                "server.servlet.session.cookie.secure=true"
        })
@AutoConfigureMockMvc
class SecurityConfigurationTest {

    @Autowired
    OrganizationService organizationService;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    BCryptPasswordEncoder passwordEncoder;

    @Autowired
    Environment environment;

    @Autowired
    UserDetailsService userDetailsService;

    @Autowired
    JsonMapper objectMapper;

    @Test
    void protectedRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/test/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test
    void unconfiguredAccountsAreNotAuthenticated() {
        org.junit.jupiter.api.Assertions.assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("unconfigured@example.test"));
    }

    @Test
    void authenticatedMutationRequiresAndAcceptsCsrfToken() throws Exception {
        mockMvc.perform(post("/api/v1/test/mutation").with(user("reviewer")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/test/mutation").with(user("reviewer")).with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void documentedPublicPostRoutesAreReachableWithCsrfProtection() throws Exception {
        String[] paths = {
                "/api/v1/session/login",
                "/api/v1/password-reset-requests",
                "/api/v1/password-resets",
                "/api/v1/account-activations",
                "/api/v2/session/login",
                "/api/v2/password-reset-requests",
                "/api/v2/password-resets",
                "/api/v2/account-activations"
        };

        for (String path : paths) {
            mockMvc.perform(post(path))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
            mockMvc.perform(post(path).with(csrf()))
                    .andExpect(status().isNoContent());
        }
    }

    @Test
    void csrfBootstrapIsPublicSessionBackedAndNotCacheable() throws Exception {
        mockMvc.perform(get("/api/v2/session/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty())
                .andDo(result -> {
                    org.junit.jupiter.api.Assertions.assertTrue(
                            result.getResponse().getHeader("Cache-Control").contains("no-store"));
                    org.junit.jupiter.api.Assertions.assertNotNull(result.getRequest().getSession(false));
                });
    }

    @Test
    void bootstrappedTokenIsAcceptedInTheContractHeader() throws Exception {
        MvcResult bootstrap = mockMvc.perform(get("/api/v2/session/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(bootstrap.getResponse().getContentAsString())
                .get("csrfToken").asString();
        MockHttpSession session = (MockHttpSession) bootstrap.getRequest().getSession(false);

        mockMvc.perform(post("/api/v2/session/login")
                        .session(session)
                        .header("X-CSRF-TOKEN", token))
                .andExpect(status().isNoContent());
    }

    @Test
    void healthEndpointIsAvailableWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void organizationApiRequiresAuthenticationAndExplicitManagementAuthorityAndScope() throws Exception {
        mockMvc.perform(get("/api/v2/employees"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(post("/api/v2/employees").with(user("admin")
                        .authorities(new SimpleGrantedAuthority("ORG.USER.MANAGE"))).with(csrf())
                        .contentType("application/json")
                        .content("""
                                {"employeeCode":"E-1","firstName":"Ari","lastName":"Kim",
                                 "workEmail":"ari@example.test","employmentStartDate":"2024-01-01"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void organizationEmployeeCreationMapsSuccessAndValidationToContractStatuses() throws Exception {
        Employee employee = new Employee("E-1", "Ari", "Kim", "ari@example.test",
                java.time.LocalDate.parse("2024-01-01"), null, null, null, java.time.Instant.now());
        when(organizationService.createEmployee(eq("E-1"), eq("Ari"), eq("Kim"), eq("ari@example.test"),
                any(), any(), any(), any(), any())).thenReturn(employee);
        var admin = user("admin").authorities(new SimpleGrantedAuthority("ROLE_ADMIN"),
                new SimpleGrantedAuthority("ORG.USER.MANAGE"), new SimpleGrantedAuthority("SCOPE:ORG"));
        mockMvc.perform(post("/api/v2/employees").with(admin).with(csrf())
                        .contentType("application/json")
                        .content("""
                                {"employeeCode":"E-1","firstName":"Ari","lastName":"Kim",
                                 "workEmail":"ari@example.test","employmentStartDate":"2024-01-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayName").value("Ari Kim"));

        mockMvc.perform(post("/api/v2/employees").with(admin).with(csrf())
                        .contentType("application/json")
                        .content("{\"employeeCode\":\"E-2\",\"firstName\":\" \",\"lastName\":\"Lee\",\"workEmail\":\"bad\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void staleEmployeeUpdateConflictUsesTheStandardErrorEnvelope() throws Exception {
        doThrow(new OrganizationService.InvalidOrganizationState("If-Match version is stale."))
                .when(organizationService).updateEmployee(eq(7L), eq("\"0\""), any(), any(), any(), any(),
                        any(), any(), any(), any(), any());
        var admin = user("admin").authorities(new SimpleGrantedAuthority("ROLE_ADMIN"),
                new SimpleGrantedAuthority("ORG.USER.MANAGE"), new SimpleGrantedAuthority("SCOPE:ORG"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v2/employees/7")
                        .with(admin).with(csrf()).header("If-Match", "\"0\"")
                        .contentType("application/json")
                        .content("""
                                {"employeeCode":"E-7","firstName":"Rae","lastName":"Tan",
                                 "workEmail":"rae@example.test","employmentStartDate":"2022-01-01"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void sessionCookieDefaultsAndBcryptStrengthAreConfigured() {
        org.junit.jupiter.api.Assertions.assertEquals("true",
                environment.getProperty("server.servlet.session.cookie.http-only"));
        org.junit.jupiter.api.Assertions.assertEquals("lax",
                environment.getProperty("server.servlet.session.cookie.same-site"));
        org.junit.jupiter.api.Assertions.assertEquals("true",
                environment.getProperty("server.servlet.session.cookie.secure"));
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.encode("test-password").startsWith("$2a$12$"));
    }

    @Test
    void appendOnlyRepositoriesDoNotExposeUpdateOrDeleteOperations() {
        for (Class<?> repository : new Class<?>[] {
                AuditEventRepository.class,
                NotificationOutboxRepository.class,
                NotificationDeliveryRepository.class
        }) {
            org.junit.jupiter.api.Assertions.assertFalse(Arrays.stream(repository.getMethods())
                    .map(java.lang.reflect.Method::getName)
                    .anyMatch(name -> name.equals("save") || name.startsWith("delete") || name.startsWith("update")),
                    repository.getSimpleName() + " must not expose update/delete methods");
        }
    }

    @Test
    void userAccountRepositoryExposesOnlyExplicitAccountLifecyclePersistence() {
        org.junit.jupiter.api.Assertions.assertTrue(Arrays.stream(
                        com.holidayroster.organization.infrastructure.UserAccountRepository.class.getMethods())
                .map(java.lang.reflect.Method::getName)
                .anyMatch(name -> name.equals("save")));
        org.junit.jupiter.api.Assertions.assertFalse(Arrays.stream(
                        com.holidayroster.organization.infrastructure.UserAccountRepository.class.getMethods())
                .map(java.lang.reflect.Method::getName)
                .anyMatch(name -> name.startsWith("delete") || name.startsWith("update")));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({SecurityConfiguration.class, PasswordConfiguration.class,
            ApiExceptionHandler.class, CorrelationIdFilter.class, CsrfTokenController.class,
            com.holidayroster.shared.security.OrganizationAuthorization.class,
            OrganizationV2Controller.class, TestController.class})
    static class TestApplication {
        @Bean OrganizationService testOrganizationService() { return Mockito.mock(OrganizationService.class); }
    }

    @RestController
    static class TestController {

        @GetMapping("/api/v1/test/protected")
        String protectedRoute() {
            return "protected";
        }

        @PostMapping({
                "/api/v1/session/login",
                "/api/v1/password-reset-requests",
                "/api/v1/password-resets",
                "/api/v1/account-activations",
                "/api/v2/session/login",
                "/api/v2/password-reset-requests",
                "/api/v2/password-resets",
                "/api/v2/account-activations",
                "/api/v1/test/mutation"
        })
        @ResponseStatus(HttpStatus.NO_CONTENT)
        void mutation() {
        }

        @PostMapping("/api/v1/test/validation")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        void validate(@RequestBody @Valid ValidationInput input) {
        }

        @GetMapping("/api/v1/test/failure")
        String failure() {
            throw new IllegalStateException("internal secret detail");
        }

        record ValidationInput(@NotBlank String value) {
        }
    }
}
