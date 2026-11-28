package com.holidayroster.calendar;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.holidayroster.availability.domain.AvailabilityRecord;
import com.holidayroster.calendar.domain.Holiday;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class HolidayAndAvailabilityInvariantTest {
    @Test
    void holidayRequiresExplicitValidCountsAndDutyWindow() {
        Instant now = Instant.now();
        assertDoesNotThrow(() -> new Holiday("Winter cover", LocalDate.of(2027, 1, 1), 1, 0, null, null, now));
        assertThrows(IllegalArgumentException.class, () -> new Holiday("Winter cover", LocalDate.of(2027, 1, 1), 0, 0, null, null, now));
        assertThrows(IllegalArgumentException.class, () -> new Holiday("Winter cover", LocalDate.of(2027, 1, 1), 1, 0, LocalDateTime.of(2027, 1, 1, 18, 0), LocalDateTime.of(2027, 1, 1, 9, 0), now));
    }
    @Test
    void availabilityUsesInclusiveValidIntervalsAndCannotBeChangedAfterWithdrawal() {
        Instant now = Instant.now();
        AvailabilityRecord record = new AvailabilityRecord(7L, AvailabilityRecord.Type.UNAVAILABLE, LocalDate.of(2027, 1, 1), LocalDate.of(2027, 1, 2), null, null, now);
        assertThrows(IllegalArgumentException.class, () -> new AvailabilityRecord(7L, AvailabilityRecord.Type.UNAVAILABLE, LocalDate.of(2027, 1, 2), LocalDate.of(2027, 1, 1), null, null, now));
        record.withdraw(now.plusSeconds(1));
        assertThrows(IllegalArgumentException.class, () -> record.update(AvailabilityRecord.Type.AVAILABLE, LocalDate.of(2027, 1, 1), LocalDate.of(2027, 1, 2), null, null, now.plusSeconds(2)));
    }
}
