package com.holidayroster.shared;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.json.JsonMapper;
import com.holidayroster.shared.SecurityConfigurationTest.TestApplication;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = TestApplication.class, properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
})
@AutoConfigureMockMvc
class ApiExceptionHandlerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JsonMapper objectMapper;

    @Test
    void validationErrorsMatchContractAndCarryCorrelationId() throws Exception {
        mockMvc.perform(post("/api/v1/test/validation")
                        .with(user("reviewer"))
                        .with(csrf())
                        .header("X-Correlation-ID", "correlation-123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(new TestRequest(" "))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("value"))
                .andExpect(jsonPath("$.fieldErrors[0].code").value("INVALID_VALUE"))
                .andExpect(jsonPath("$.fieldErrors[0].message").value("Invalid value."))
                .andExpect(jsonPath("$.correlationId").value("correlation-123"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void unexpectedErrorsAreSanitized() throws Exception {
        mockMvc.perform(get("/api/v1/test/failure").with(user("reviewer")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("internal secret detail"))))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test
    void malformedJsonUsesContractErrorEnvelope() throws Exception {
        mockMvc.perform(post("/api/v1/test/validation")
                        .with(user("reviewer"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
                .andExpect(jsonPath("$.message").value("Request could not be parsed."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test
    void missingResourceUsesContractErrorEnvelope() throws Exception {
        mockMvc.perform(get("/api/v2/route-that-does-not-exist").with(user("reviewer")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Resource not found."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    record TestRequest(@NotBlank String value) {
    }
}
