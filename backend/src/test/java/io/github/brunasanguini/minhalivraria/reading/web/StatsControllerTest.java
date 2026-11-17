package io.github.brunasanguini.minhalivraria.reading.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.reading.application.BookTimeResponse;
import io.github.brunasanguini.minhalivraria.reading.application.DailyPagesResponse;
import io.github.brunasanguini.minhalivraria.reading.application.FastestReadingResponse;
import io.github.brunasanguini.minhalivraria.reading.application.StatsOverviewResponse;
import io.github.brunasanguini.minhalivraria.reading.application.StatsService;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = StatsController.class)
class StatsControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private StatsService service;

    @Test
    void shouldAnswerTheOverviewOfTheMonthAsked() {
        given(service.overview(2026, 11))
                .willReturn(new StatsOverviewResponse(
                        2026,
                        11,
                        1,
                        3,
                        new BigDecimal("4.5"),
                        1,
                        1240,
                        6,
                        21,
                        1,
                        2,
                        new FastestReadingResponse(42, "O Hobbit", 6)));

        assertThat(mvc.get().uri("/api/v1/stats/overview?year=2026&month=11"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "year": 2026,
                          "month": 11,
                          "finishedInMonth": 1,
                          "finishedInYear": 3,
                          "averageRating": 4.5,
                          "rereadsInYear": 1,
                          "pagesInYear": 1240,
                          "currentStreak": 6,
                          "longestStreak": 21,
                          "finishedLast30Days": 1,
                          "inProgress": 2,
                          "fastestInYear": { "bookId": 42, "title": "O Hobbit", "days": 6 }
                        }
                        """);
    }

    @Test
    void shouldRefuseAMonthOutsideTheCalendar() {
        assertThat(mvc.get().uri("/api/v1/stats/overview?month=13")).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswerThePagesOfEachDay() {
        given(service.dailyPages(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-30")))
                .willReturn(List.of(new DailyPagesResponse(LocalDate.parse("2026-11-08"), 25)));

        assertThat(mvc.get().uri("/api/v1/stats/daily-pages?from=2026-11-01&to=2026-11-30"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [{ "date": "2026-11-08", "pages": 25 }]
                        """);
    }

    @Test
    void shouldRequireBothEndsOfThePeriod() {
        assertThat(mvc.get().uri("/api/v1/stats/daily-pages?from=2026-11-01")).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswer400ForAPeriodLongerThanAYear() {
        given(service.dailyPages(any(), any())).willThrow(new BadRequestException("stats.period-too-long", 366));

        assertThat(mvc.get().uri("/api/v1/stats/daily-pages?from=2025-01-01&to=2026-11-30"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "code": "stats.period-too-long",
                          "detail": "As estatísticas aceitam períodos de até 366 dias."
                        }
                        """);
    }

    @Test
    void shouldAnswerTheTimeOfEachBook() {
        given(service.booksTime(LocalDate.parse("2026-06-01"), LocalDate.parse("2026-11-30")))
                .willReturn(List.of(new BookTimeResponse(42, "O Hobbit", "/api/v1/images/3", 6, 210)));

        assertThat(mvc.get().uri("/api/v1/stats/books-time?from=2026-06-01&to=2026-11-30"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [{ "bookId": 42, "title": "O Hobbit", "coverUrl": "/api/v1/images/3", "days": 6, "pages": 210 }]
                        """);
    }
}
