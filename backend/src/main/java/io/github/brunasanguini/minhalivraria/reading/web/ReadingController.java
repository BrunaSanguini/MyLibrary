package io.github.brunasanguini.minhalivraria.reading.web;

import io.github.brunasanguini.minhalivraria.reading.application.EndDateRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingPeriodRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingResponse;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.reading.application.SessionRequest;
import io.github.brunasanguini.minhalivraria.reading.application.SessionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "readings", description = "Readings of a book and their daily sessions")
@RestController
class ReadingController {

    private final ReadingService service;

    ReadingController(ReadingService service) {
        this.service = service;
    }

    @Operation(
            operationId = "listBookReadings",
            summary = "Readings of a book, the one in progress first and then from the latest to the oldest")
    @GetMapping("/books/{bookId}/readings")
    List<ReadingResponse> listByBook(@PathVariable long bookId) {
        return service.listByBook(bookId);
    }

    @Operation(
            operationId = "createReading",
            summary = "Starts a reading or registers an old one",
            description = "IN_PROGRESS needs startDate; FINISHED and ABANDONED need endDate. A second reading in"
                    + " progress of the same book: 409 reading.in-progress-exists.")
    @PostMapping("/books/{bookId}/readings")
    ResponseEntity<ReadingResponse> create(@PathVariable long bookId, @Valid @RequestBody ReadingRequest request) {
        ReadingResponse created = service.create(bookId, request);
        return ResponseEntity.created(URI.create("/api/v1/readings/" + created.id()))
                .body(created);
    }

    @Operation(
            operationId = "updateReading",
            summary = "Corrects the dates and the reread mark",
            description = "The status only changes by finish and abandon. A period that leaves a session outside:"
                    + " 422 session.out-of-period.")
    @PutMapping("/readings/{id}")
    ReadingResponse update(@PathVariable long id, @Valid @RequestBody ReadingPeriodRequest request) {
        return service.reschedule(id, request);
    }

    @Operation(
            operationId = "finishReading",
            description = "A reading that is not in progress: 409 reading.not-in-progress.")
    @PostMapping("/readings/{id}/finish")
    ReadingResponse finish(@PathVariable long id, @Valid @RequestBody EndDateRequest request) {
        return service.finish(id, request.endDate());
    }

    @Operation(
            operationId = "abandonReading",
            description = "A reading that is not in progress: 409 reading.not-in-progress.")
    @PostMapping("/readings/{id}/abandon")
    ReadingResponse abandon(@PathVariable long id, @Valid @RequestBody EndDateRequest request) {
        return service.abandon(id, request.endDate());
    }

    @Operation(
            operationId = "resumeReading",
            summary = "Reads an abandoned book again, in the same reading",
            description = "The reading is in progress again, with no end. Not abandoned: 409 reading.not-abandoned;"
                    + " another reading of the book in progress: 409 reading.in-progress-exists.")
    @PostMapping("/readings/{id}/resume")
    ReadingResponse resume(@PathVariable long id) {
        return service.resume(id);
    }

    @Operation(operationId = "deleteReading", summary = "Deletes a reading and its sessions")
    @DeleteMapping("/readings/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "listReadingSessions", summary = "Sessions of a reading, by date")
    @GetMapping("/readings/{id}/sessions")
    List<SessionResponse> listSessions(
            @PathVariable long id,
            @RequestParam(required = false) @Nullable LocalDate from,
            @RequestParam(required = false) @Nullable LocalDate to) {
        return service.listSessions(id, from, to);
    }

    @Operation(
            operationId = "createReadingSession",
            summary = "Registers what was read on one day",
            description = "Exactly one of pagesRead and currentPage (400 session.pages-mode); currentPage is"
                    + " converted into pages read. 422: session.page-count-required, session.out-of-period,"
                    + " session.exceeds-page-count and session.page-not-ahead.")
    @PostMapping("/readings/{id}/sessions")
    ResponseEntity<SessionResponse> addSession(@PathVariable long id, @Valid @RequestBody SessionRequest request) {
        SessionResponse created = service.addSession(id, request);
        return ResponseEntity.created(URI.create("/api/v1/readings/" + id + "/sessions/" + created.id()))
                .body(created);
    }

    @Operation(operationId = "updateReadingSession", description = "Same rules as creating a session.")
    @PutMapping("/readings/{id}/sessions/{sessionId}")
    SessionResponse updateSession(
            @PathVariable long id, @PathVariable long sessionId, @Valid @RequestBody SessionRequest request) {
        return service.updateSession(id, sessionId, request);
    }

    @Operation(operationId = "deleteReadingSession")
    @DeleteMapping("/readings/{id}/sessions/{sessionId}")
    ResponseEntity<Void> deleteSession(@PathVariable long id, @PathVariable long sessionId) {
        service.deleteSession(id, sessionId);
        return ResponseEntity.noContent().build();
    }
}
