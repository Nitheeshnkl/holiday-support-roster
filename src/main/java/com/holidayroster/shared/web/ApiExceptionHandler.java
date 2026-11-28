package com.holidayroster.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.holidayroster.organization.application.OrganizationService;
import org.springframework.security.access.AccessDeniedException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleInvalidRequest(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<ApiError.FieldError> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(ApiExceptionHandler::toFieldError)
                .toList();
        return response(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_ERROR",
                "Request validation failed.", fields, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> handleConstraintViolation(
            ConstraintViolationException exception, HttpServletRequest request) {
        List<ApiError.FieldError> fields = exception.getConstraintViolations().stream()
                .map(violation -> new ApiError.FieldError(
                        violation.getPropertyPath().toString(), "INVALID_VALUE", "Invalid value."))
                .toList();
        return response(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_ERROR",
                "Request validation failed.", fields, request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> handleMalformedRequest(Exception exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST",
                "Request could not be parsed.", null, request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> handleMissingRoute(NoResourceFoundException exception, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found.", null, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> handleUnsupportedMethod(
            HttpRequestMethodNotSupportedException exception, HttpServletRequest request) {
        return response(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED",
                "Request method is not supported.", null, request);
    }

    @ExceptionHandler({DataIntegrityViolationException.class, ObjectOptimisticLockingFailureException.class})
    ResponseEntity<ApiError> handleConflict(Exception exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "CONFLICT",
                "The resource changed or conflicts with an existing record.", null, request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletRequest request) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred.", null, request);
    }

    @ExceptionHandler(OrganizationService.InvalidOrganizationState.class)
    ResponseEntity<ApiError> handleOrganizationConflict(RuntimeException exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "CONFLICT", exception.getMessage(), null, request);
    }

    @ExceptionHandler(OrganizationService.OrganizationValidationException.class)
    ResponseEntity<ApiError> handleOrganizationValidation(RuntimeException exception, HttpServletRequest request) {
        return response(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_ERROR", exception.getMessage(), null, request);
    }

    @ExceptionHandler(OrganizationService.OrganizationNotFound.class)
    ResponseEntity<ApiError> handleOrganizationNotFound(RuntimeException exception, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage(), null, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied.", null, request);
    }

    private static ApiError.FieldError toFieldError(FieldError error) {
        return new ApiError.FieldError(error.getField(), "INVALID_VALUE", "Invalid value.");
    }

    private static ResponseEntity<ApiError> response(
            HttpStatus status,
            String code,
            String message,
            List<ApiError.FieldError> fieldErrors,
            HttpServletRequest request) {
        ApiError error = new ApiError(code, message, fieldErrors,
                CorrelationIdFilter.getCorrelationId(request), Instant.now());
        return ResponseEntity.status(status).body(error);
    }
}
