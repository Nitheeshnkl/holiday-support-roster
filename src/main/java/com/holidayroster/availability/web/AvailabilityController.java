package com.holidayroster.availability.web;

import com.holidayroster.availability.application.AvailabilityService;
import com.holidayroster.availability.domain.AvailabilityRecord;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated @RestController @RequestMapping("/api/v2/availability")
public class AvailabilityController {
    private final AvailabilityService service;
    public AvailabilityController(AvailabilityService service) { this.service = service; }
    @GetMapping public AvailabilityList list(@RequestParam(required = false) Long employeeId, @RequestParam(required = false) LocalDate fromDate, @RequestParam(required = false) LocalDate toDate, @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "25") @Min(1) @Max(100) int pageSize, Authentication authentication) {
        Page<AvailabilityRecord> result = service.list(employeeId, fromDate, toDate, page, pageSize, authentication);
        return new AvailabilityList(result.getContent().stream().map(AvailabilityView::from).toList(), PageMeta.from(result));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public AvailabilityView create(@Valid @RequestBody AvailabilityInput input, Authentication authentication) { return AvailabilityView.from(service.create(input.availabilityType(), input.startDate(), input.endDate(), input.reasonCode(), input.note(), authentication)); }
    @PatchMapping("/{id}") public ResponseEntity<AvailabilityView> update(@PathVariable long id, @RequestHeader("If-Match") String ifMatch, @Valid @RequestBody AvailabilityInput input, Authentication authentication) { AvailabilityRecord record = service.update(id, ifMatch, input.availabilityType(), input.startDate(), input.endDate(), input.reasonCode(), input.note(), authentication); return ResponseEntity.ok().eTag("\"" + record.getRowVersion() + "\"").body(AvailabilityView.from(record)); }
    @PostMapping("/{id}/withdraw") @ResponseStatus(HttpStatus.NO_CONTENT) public void withdraw(@PathVariable long id, @RequestHeader("If-Match") String ifMatch, Authentication authentication) { service.withdraw(id, ifMatch, authentication); }
    public record AvailabilityInput(@NotNull AvailabilityRecord.Type availabilityType, @NotNull LocalDate startDate, @NotNull LocalDate endDate, @Size(max = 40) String reasonCode, @Size(max = 500) String note) { }
    public record AvailabilityView(Long id, Long employeeId, AvailabilityRecord.Type availabilityType, LocalDate startDate, LocalDate endDate, String reasonCode, String note, AvailabilityRecord.Status status, long rowVersion) { static AvailabilityView from(AvailabilityRecord record) { return new AvailabilityView(record.getId(), record.getEmployeeId(), record.getAvailabilityType(), record.getStartDate(), record.getEndDate(), record.getReasonCode(), record.getNote(), record.getStatus(), record.getRowVersion()); } }
    public record AvailabilityList(List<AvailabilityView> items, PageMeta page) { }
    public record PageMeta(int number, int size, long totalElements, int totalPages) { static PageMeta from(Page<?> page) { return new PageMeta(page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()); } }
}
