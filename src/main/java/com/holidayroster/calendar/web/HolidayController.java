package com.holidayroster.calendar.web;

import com.holidayroster.calendar.application.CalendarService;
import com.holidayroster.calendar.domain.Holiday;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/v2/holidays")
public class HolidayController {
    private final CalendarService service;
    public HolidayController(CalendarService service) { this.service = service; }
    @GetMapping public HolidayList list(@RequestParam(required = false) LocalDate fromDate, @RequestParam(required = false) LocalDate toDate, @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "25") @Min(1) @Max(100) int pageSize, Authentication authentication) {
        Page<Holiday> result = service.list(fromDate, toDate, page, pageSize, authentication);
        return new HolidayList(result.getContent().stream().map(HolidayView::from).toList(), PageMeta.from(result));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public HolidayView create(@Valid @RequestBody HolidayInput input, Authentication authentication) {
        return HolidayView.from(service.create(input.name(), input.holidayDate(), input.primaryCount(), input.standbyCount(), input.dutyWindowStart(), input.dutyWindowEnd(), authentication));
    }
    @PatchMapping("/{id}") public ResponseEntity<HolidayView> update(@PathVariable long id, @RequestHeader("If-Match") String ifMatch, @Valid @RequestBody HolidayInput input, Authentication authentication) {
        Holiday holiday = service.update(id, ifMatch, input.name(), input.holidayDate(), input.primaryCount(), input.standbyCount(), input.dutyWindowStart(), input.dutyWindowEnd(), authentication);
        return ResponseEntity.ok().eTag("\"" + holiday.getRowVersion() + "\"").body(HolidayView.from(holiday));
    }
    public record HolidayInput(@NotBlank @Size(max = 160) String name, @NotNull LocalDate holidayDate, @Min(1) int primaryCount, @Min(0) int standbyCount, LocalDateTime dutyWindowStart, LocalDateTime dutyWindowEnd) { }
    public record HolidayView(Long id, String name, LocalDate holidayDate, int primaryCount, int standbyCount, LocalDateTime dutyWindowStart, LocalDateTime dutyWindowEnd, String status, long rowVersion) { static HolidayView from(Holiday holiday) { return new HolidayView(holiday.getId(), holiday.getName(), holiday.getHolidayDate(), holiday.getPrimaryCount(), holiday.getStandbyCount(), holiday.getDutyWindowStart(), holiday.getDutyWindowEnd(), holiday.getStatus().name(), holiday.getRowVersion()); } }
    public record HolidayList(List<HolidayView> items, PageMeta page) { }
    public record PageMeta(int number, int size, long totalElements, int totalPages) { static PageMeta from(Page<?> page) { return new PageMeta(page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()); } }
}
