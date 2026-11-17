package io.github.brunasanguini.minhalivraria.reading.web;

import io.github.brunasanguini.minhalivraria.reading.application.BookTimeResponse;
import io.github.brunasanguini.minhalivraria.reading.application.DailyPagesResponse;
import io.github.brunasanguini.minhalivraria.reading.application.StatsOverviewResponse;
import io.github.brunasanguini.minhalivraria.reading.application.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "stats", description = "Reading statistics of the profile, calculated on every request")
@RestController
@RequestMapping("/stats")
class StatsController {

    private static final String PERIOD_RULES =
            "Both days included. A period that ends before it starts: 400 stats.invalid-period; more than 366 days:"
                    + " 400 stats.period-too-long.";

    private final StatsService service;

    StatsController(StatsService service) {
        this.service = service;
    }

    @Operation(
            operationId = "getStatsOverview",
            summary = "Totals of the month and of its year, average rating, rereads, pages and streaks",
            description = "Without year or month, the current ones. The streaks always count up to today.")
    @GetMapping("/overview")
    StatsOverviewResponse overview(
            @RequestParam(required = false) @Min(1900) @Max(2999) @Nullable Integer year,
            @RequestParam(required = false) @Min(1) @Max(12) @Nullable Integer month) {
        return service.overview(year, month);
    }

    @Operation(
            operationId = "getDailyPages",
            summary = "Pages read per day, only the days with reading",
            description = PERIOD_RULES)
    @GetMapping("/daily-pages")
    List<DailyPagesResponse> dailyPages(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return service.dailyPages(from, to);
    }

    @Operation(
            operationId = "getBooksTime",
            summary = "Days and pages of each book in the period, the books with more days first",
            description = PERIOD_RULES)
    @GetMapping("/books-time")
    List<BookTimeResponse> booksTime(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return service.booksTime(from, to);
    }
}
