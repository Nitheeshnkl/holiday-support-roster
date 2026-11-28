package com.holidayroster.shared.web;

import java.time.Instant;
import java.util.List;

public record ApiError(
        String code,
        String message,
        List<FieldError> fieldErrors,
        String correlationId,
        Instant timestamp) {

    public record FieldError(String field, String code, String message) {
    }
}
