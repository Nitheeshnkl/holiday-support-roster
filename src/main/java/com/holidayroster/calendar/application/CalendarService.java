package com.holidayroster.calendar.application;

import com.holidayroster.calendar.domain.Holiday;
import com.holidayroster.calendar.infrastructure.HolidayRepository;
import com.holidayroster.organization.application.OrganizationService;
import com.holidayroster.organization.infrastructure.EmployeeRepository;
import com.holidayroster.shared.security.OrganizationAuthorization;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CalendarService {
    private final HolidayRepository holidays;
    private final EmployeeRepository employees;
    private final OrganizationAuthorization authorization;
    private final Clock clock;
    public CalendarService(HolidayRepository holidays, EmployeeRepository employees, OrganizationAuthorization authorization, Clock clock) { this.holidays = holidays; this.employees = employees; this.authorization = authorization; this.clock = clock; }
    @Transactional(readOnly = true)
    public Page<Holiday> list(LocalDate from, LocalDate to, int page, int size, Authentication caller) {
        if (!authorization.hasPermission(caller, "CALENDAR.READ")) throw new AccessDeniedException("Calendar read permission is required.");
        return holidays.findByHolidayDateBetweenOrderByHolidayDate(from == null ? LocalDate.MIN : from, to == null ? LocalDate.MAX : to, PageRequest.of(page, size));
    }
    @Transactional
    public Holiday create(String name, LocalDate date, int primary, int standby, LocalDateTime start, LocalDateTime end, Authentication caller) {
        requireManage(caller); verifyCapacity(date, primary, standby);
        if (holidays.existsByHolidayDateAndIdNot(date, -1L)) throw conflict("Holiday date already exists.");
        return holidays.save(new Holiday(name, date, primary, standby, start, end, Instant.now(clock)));
    }
    @Transactional
    public Holiday update(long id, String ifMatch, String name, LocalDate date, int primary, int standby, LocalDateTime start, LocalDateTime end, Authentication caller) {
        requireManage(caller); verifyCapacity(date, primary, standby);
        Holiday holiday = holidays.findByIdForUpdate(id).orElseThrow(() -> notFound("Holiday not found."));
        version(ifMatch, holiday.getRowVersion());
        if (holidays.existsByHolidayDateAndIdNot(date, id)) throw conflict("Holiday date already exists.");
        holiday.update(name, date, primary, standby, start, end, Instant.now(clock));
        return holiday;
    }
    private void verifyCapacity(LocalDate date, int primary, int standby) { if (date == null || primary + standby > employees.countActiveRotationEligibleOn(date)) throw new OrganizationService.OrganizationValidationException("Requested staffing exceeds the active rotation-eligible employee pool."); }
    private void requireManage(Authentication caller) { if (!authorization.hasOrganizationPermission(caller, "CALENDAR.MANAGE", false)) throw new AccessDeniedException("Calendar management requires organization scope."); }
    private static void version(String supplied, long actual) { if (supplied == null || !supplied.replace("\"", "").equals(Long.toString(actual))) throw conflict("If-Match version is stale."); }
    private static RuntimeException conflict(String message) { return new OrganizationService.InvalidOrganizationState(message); }
    private static RuntimeException notFound(String message) { return new OrganizationService.OrganizationNotFound(message); }
}
