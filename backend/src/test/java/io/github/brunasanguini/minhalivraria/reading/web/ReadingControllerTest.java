package io.github.brunasanguini.minhalivraria.reading.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.application.ProgressResponse;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingPeriodRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingResponse;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.reading.application.SessionRequest;
import io.github.brunasanguini.minhalivraria.reading.application.SessionResponse;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebSliceTest(controllers = ReadingController.class)
class ReadingControllerTest {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";
    private static final LocalDate NOV_1 = LocalDate.parse("2026-11-01");
    private static final LocalDate NOV_8 = LocalDate.parse("2026-11-08");

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ReadingService service;

    @Test
    void shouldListTheReadingsOfABook() {
        given(service.listByBook(42)).willReturn(List.of(reading(ReadingStatus.IN_PROGRESS, null)));

        assertThat(mvc.get().uri("/api/v1/books/42/readings"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [
                          {
                            "id": 9,
                            "bookId": 42,
                            "status": "IN_PROGRESS",
                            "startDate": "2026-11-01",
                            "endDate": null,
                            "reread": false,
                            "progress": { "pagesRead": 120, "pageCount": 576, "percent": 20 },
                            "sessionCount": 5
                          }
                        ]
                        """);
    }

    @Test
    void shouldAnswerANewReadingWith201AndItsLocation() {
        given(service.create(42, new ReadingRequest(ReadingStatus.IN_PROGRESS, NOV_1, null, false)))
                .willReturn(reading(ReadingStatus.IN_PROGRESS, null));

        assertThat(post("/api/v1/books/42/readings", """
                        { "status": "IN_PROGRESS", "startDate": "2026-11-01", "endDate": null, "reread": false }
                        """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/readings/9")
                .bodyJson()
                .extractingPath("$.id")
                .isEqualTo(9);
    }

    @Test
    void shouldRequireTheStatusOfANewReading() {
        assertThat(post("/api/v1/books/42/readings", """
                        { "startDate": "2026-11-01" }
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("status");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswer409ForASecondReadingInProgress() {
        given(service.create(anyLong(), any())).willThrow(new ConflictException("reading.in-progress-exists"));

        assertThat(post("/api/v1/books/42/readings", """
                        { "status": "IN_PROGRESS", "startDate": "2026-11-01" }
                        """))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "reading.in-progress-exists", "title": "Leitura já em andamento" }
                        """);
    }

    @Test
    void shouldCorrectThePeriodOfAReading() {
        given(service.reschedule(9, new ReadingPeriodRequest(NOV_1, NOV_8, true)))
                .willReturn(reading(ReadingStatus.FINISHED, NOV_8));

        assertThat(mvc.put()
                        .uri("/api/v1/readings/9")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "startDate": "2026-11-01", "endDate": "2026-11-08", "reread": true }
                                """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.endDate")
                .isEqualTo("2026-11-08");
    }

    @Test
    void shouldFinishAndAbandonWith200AndTheUpdatedReading() {
        given(service.finish(9, NOV_8)).willReturn(reading(ReadingStatus.FINISHED, NOV_8));
        given(service.abandon(9, NOV_8)).willReturn(reading(ReadingStatus.ABANDONED, NOV_8));

        assertThat(post("/api/v1/readings/9/finish", """
                        { "endDate": "2026-11-08" }
                        """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("FINISHED");
        assertThat(post("/api/v1/readings/9/abandon", """
                        { "endDate": "2026-11-08" }
                        """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("ABANDONED");
    }

    @Test
    void shouldRequireTheEndDateToFinish() {
        assertThat(post("/api/v1/readings/9/finish", "{}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("endDate");
    }

    @Test
    void shouldAnswer409WhenResumingAReadingThatWasNotAbandoned() {
        given(service.resume(9)).willThrow(new ConflictException("reading.not-abandoned"));

        assertThat(post("/api/v1/readings/9/resume", "{}"))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("reading.not-abandoned");
    }

    @Test
    void shouldAnswer409WhenFinishingAReadingThatIsNotInProgress() {
        given(service.finish(anyLong(), any())).willThrow(new ConflictException("reading.not-in-progress"));

        assertThat(post("/api/v1/readings/9/finish", """
                        { "endDate": "2026-11-08" }
                        """))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("reading.not-in-progress");
    }

    @Test
    void shouldDeleteAReadingWith204() {
        assertThat(mvc.delete().uri("/api/v1/readings/9").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);
        then(service).should().delete(9);
    }

    @Test
    void shouldAnswer404ForAnUnknownReading() {
        willThrow(new NotFoundException("reading.not-found")).given(service).delete(404);

        assertThat(mvc.delete().uri("/api/v1/readings/404").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("reading.not-found");
    }

    @Test
    void shouldListTheSessionsOfAPeriod() {
        given(service.listSessions(9, NOV_1, NOV_8))
                .willReturn(List.of(new SessionResponse(3, NOV_8, 25, "Capítulo do Conselho de Elrond.")));

        assertThat(mvc.get().uri("/api/v1/readings/9/sessions?from=2026-11-01&to=2026-11-08"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [
                          {
                            "id": 3,
                            "date": "2026-11-08",
                            "pagesRead": 25,
                            "note": "Capítulo do Conselho de Elrond."
                          }
                        ]
                        """);
    }

    @Test
    void shouldListEverySessionWhenNoPeriodIsGiven() {
        given(service.listSessions(9, null, null)).willReturn(List.of());

        assertThat(mvc.get().uri("/api/v1/readings/9/sessions")).hasStatusOk();
    }

    @Test
    void shouldAnswerANewSessionWith201AndItsLocation() {
        given(service.addSession(9, new SessionRequest(NOV_8, null, 145, null)))
                .willReturn(new SessionResponse(3, NOV_8, 45, null));

        assertThat(post("/api/v1/readings/9/sessions", """
                        { "date": "2026-11-08", "pagesRead": null, "currentPage": 145, "note": null }
                        """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/readings/9/sessions/3")
                .bodyJson()
                .extractingPath("$.pagesRead")
                .isEqualTo(45);
    }

    @Test
    void shouldRefuseASessionWithoutDateOrWithPagesBelowOne() {
        assertThat(post("/api/v1/readings/9/sessions", """
                        { "pagesRead": 0 }
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[*].field")
                .asArray()
                .containsExactlyInAnyOrder("date", "pagesRead");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswer400WhenTheSessionDoesNotPickOneMode() {
        given(service.addSession(anyLong(), any())).willThrow(new BadRequestException("session.pages-mode"));

        assertThat(post("/api/v1/readings/9/sessions", """
                        { "date": "2026-11-08", "pagesRead": 10, "currentPage": 10 }
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("session.pages-mode");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "session.out-of-period",
                "session.page-count-required",
                "session.exceeds-page-count",
                "session.page-not-ahead"
            })
    void shouldAnswer422ForTheRulesOfASession(String code) {
        given(service.addSession(anyLong(), any())).willThrow(new BusinessRuleException(code));

        MvcTestResult result = post("/api/v1/readings/9/sessions", """
                { "date": "2026-11-08", "pagesRead": 10 }
                """);

        assertThat(result)
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo(code);
        // Every code has its own text in messages.properties, not the code itself.
        assertThat(result)
                .bodyJson()
                .extractingPath("$.detail")
                .asString()
                .doesNotContain(code)
                .isNotBlank();
    }

    @Test
    void shouldUpdateAndDeleteASession() {
        given(service.updateSession(9, 3, new SessionRequest(NOV_8, 30, null, "Mais um capítulo.")))
                .willReturn(new SessionResponse(3, NOV_8, 30, "Mais um capítulo."));

        assertThat(mvc.put()
                        .uri("/api/v1/readings/9/sessions/3")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "date": "2026-11-08", "pagesRead": 30, "note": "Mais um capítulo." }
                                """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.pagesRead")
                .isEqualTo(30);
        assertThat(mvc.delete().uri("/api/v1/readings/9/sessions/3").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);
        then(service).should().deleteSession(9, 3);
    }

    private MvcTestResult post(String uri, String body) {
        return mvc.post()
                .uri(uri)
                .header(REQUESTED_BY, MINHA_LIVRARIA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private static ReadingResponse reading(ReadingStatus status, LocalDate endDate) {
        return new ReadingResponse(9, 42, status, NOV_1, endDate, false, new ProgressResponse(120, 576, 20), 5);
    }
}
