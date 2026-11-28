package com.holidayroster.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.holidayroster.organization.domain.Employee;
import com.holidayroster.organization.domain.Team;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class EmployeeInvariantTest {
    private static final Instant NOW = Instant.parse("2026-11-27T00:00:00Z");

    @Test
    void employeeRequiresNamesEmailAndValidDateIntervals() {
        assertThrows(IllegalArgumentException.class, () -> employee(" ", "Lee", "lee@example.test", null, null));
        assertThrows(IllegalArgumentException.class, () -> employee("Sam", "Lee", " ", null, null));
        assertThrows(IllegalArgumentException.class, () -> employee("Sam", "Lee", "lee@example.test",
                null, LocalDate.parse("2026-01-01")));
        assertThrows(IllegalArgumentException.class, () -> new Employee("E1", "Sam", "Lee", "s@e.test",
                LocalDate.parse("2026-01-02"), LocalDate.parse("2026-01-01"), null, null, NOW));
        assertThrows(IllegalArgumentException.class, () -> new Employee("E1", "Sam", "Lee", "s@e.test",
                LocalDate.parse("2026-01-01"), null, LocalDate.parse("2026-03-01"),
                LocalDate.parse("2026-02-28"), NOW));
    }

    @Test
    void displayNameIsDerivedAndEligibilityBoundariesAreInclusiveAndIndependent() {
        Employee employee = new Employee(" E1 ", " Sam ", " Lee ", "SAM@EXAMPLE.TEST",
                LocalDate.parse("2025-01-01"), LocalDate.parse("2025-02-01"),
                LocalDate.parse("2026-01-10"), LocalDate.parse("2026-01-20"), NOW);
        assertEquals("Sam Lee", employee.getDisplayName());
        assertEquals("sam@example.test", employee.getWorkEmail());
        assertFalse(employee.isRotationEligibleOn(LocalDate.parse("2026-01-09")));
        assertTrue(employee.isRotationEligibleOn(LocalDate.parse("2026-01-10")));
        assertTrue(employee.isRotationEligibleOn(LocalDate.parse("2026-01-20")));
        assertFalse(employee.isRotationEligibleOn(LocalDate.parse("2026-01-21")));
    }

    @Test
    void absentEligibilityBoundsMeanIneligibleAndLegacyTeamNameStoragePreserves160() {
        Employee employee = employee("Sam", "Lee", "sam@example.test", null, null);
        assertFalse(employee.isRotationEligibleOn(LocalDate.parse("2026-11-27")));
        assertThrows(IllegalArgumentException.class, () -> new Team("T1", "x".repeat(161),
                LocalDate.parse("2026-01-01"), NOW));
        assertEquals(160, new Team("T1", "x".repeat(160), LocalDate.parse("2026-01-01"), NOW)
                .getName().length());
    }

    @Test
    void beanValidationRejectsInvalidMandatoryWorkEmail() {
        var validatorFactory = jakarta.validation.Validation.buildDefaultValidatorFactory();
        try (validatorFactory) {
            Employee employee = employee("Sam", "Lee", "not-an-email", null, null);
            assertTrue(validatorFactory.getValidator().validate(employee).stream()
                    .anyMatch(violation -> violation.getPropertyPath().toString().equals("workEmail")));
        }
    }

    private static Employee employee(String first, String last, String email, LocalDate eligibleFrom, LocalDate eligibleTo) {
        return new Employee("E1", first, last, email, LocalDate.parse("2025-01-01"), null,
                eligibleFrom, eligibleTo, NOW);
    }
}
