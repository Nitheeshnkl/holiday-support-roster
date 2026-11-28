package com.holidayroster.shared.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Correlation-ID";
    public static final String ATTRIBUTE_NAME = CorrelationIdFilter.class.getName() + ".correlationId";
    private static final int MAX_LENGTH = 64;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String correlationId = normalized(request.getHeader(HEADER_NAME));
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        request.setAttribute(ATTRIBUTE_NAME, correlationId);
        response.setHeader(HEADER_NAME, correlationId);
        filterChain.doFilter(request, response);
    }

    public static String getCorrelationId(HttpServletRequest request) {
        Object value = request.getAttribute(ATTRIBUTE_NAME);
        return value instanceof String id ? id : null;
    }

    private static String normalized(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            return null;
        }
        for (int i = 0; i < value.length(); i++) {
            char character = value.charAt(i);
            if (Character.isISOControl(character)) {
                return null;
            }
        }
        return value;
    }
}
