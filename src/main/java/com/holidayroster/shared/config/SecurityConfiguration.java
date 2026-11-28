package com.holidayroster.shared.config;

import com.holidayroster.shared.web.ApiError;
import com.holidayroster.shared.web.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.beans.factory.ObjectProvider;
import com.holidayroster.account.security.AccountUserDetailsService;
import com.holidayroster.organization.infrastructure.UserAccountRepository;
import com.holidayroster.account.infrastructure.AccountAuthorityRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import tools.jackson.databind.json.JsonMapper;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {

    private static final String[] PUBLIC_POST_PATHS = {
            "/api/v1/session/login",
            "/api/v1/password-reset-requests",
            "/api/v1/password-resets",
            "/api/v1/account-activations",
            "/api/v2/session/login",
            "/api/v2/password-reset-requests",
            "/api/v2/password-resets",
            "/api/v2/account-activations"
    };

    @Bean
    UserDetailsService accountUserDetailsService(ObjectProvider<UserAccountRepository> accounts, ObjectProvider<AccountAuthorityRepository> authorities) {
        return new AccountUserDetailsService(accounts, authorities);
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain applicationSecurity(
            HttpSecurity http,
            JsonMapper objectMapper) throws Exception {
        AuthenticationEntryPoint authenticationEntryPoint = (request, response, exception) ->
                writeError(request, response, objectMapper, 401,
                        "UNAUTHORIZED", "Authentication required.");
        AccessDeniedHandler accessDeniedHandler = (request, response, exception) ->
                writeError(request, response, objectMapper, 403,
                        "FORBIDDEN", "Access denied.");

        http
                .cors(AbstractHttpConfigurer::disable)
                .csrf(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionFixation(fixation -> fixation.migrateSession()))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"))
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(Customizer.withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31_536_000)))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.POST, PUBLIC_POST_PATHS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/session/csrf", "/api/v1/session/csrf").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);

        return http.build();
    }

    private static void writeError(
            HttpServletRequest request,
            HttpServletResponse response,
            JsonMapper objectMapper,
            int status,
            String code,
            String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), new ApiError(
                code, message, null, CorrelationIdFilter.getCorrelationId(request), Instant.now()));
    }
}
