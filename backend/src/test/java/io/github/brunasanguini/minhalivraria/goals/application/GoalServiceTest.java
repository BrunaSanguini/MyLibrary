package io.github.brunasanguini.minhalivraria.goals.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.reading.application.SessionRequest;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/** The readings are all in 2025, a year that is over, so no rule about today gets in the way. */
@SpringBootTest
@Transactional
class GoalServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final int YEAR = 2025;

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private GoalService goals;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private ReadingService readings;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private Clock clock;

    private long hobbit;
    private long dune;
    private long withoutPages;

    @BeforeEach
    void books() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        hobbit = book("O Hobbit", 300, tolkien);
        dune = book("Duna", 600, tolkien);
        withoutPages = book("Contos Inacabados", null, tolkien);
    }

    @Test
    void shouldCreateAGoalThatStartsAtZero() {
        GoalResponse goal = goals.create(yearly(GoalType.BOOKS, 24));

        assertThat(goal.type()).isEqualTo(GoalType.BOOKS);
        assertThat(goal.period()).isEqualTo(GoalPeriod.YEAR);
        assertThat(goal.year()).isEqualTo(YEAR);
        assertThat(goal.month()).isNull();
        assertThat(goal.target()).isEqualTo(24);
        assertThat(goal.current()).isZero();
        assertThat(goal.percent()).isZero();
    }

    @Test
    void shouldRefuseASecondGoalOfTheSameTypeAndPeriod() {
        goals.create(yearly(GoalType.BOOKS, 24));
        goals.create(monthly(GoalType.BOOKS, 3, 2));
        entityManager.flush();

        assertCode(() -> goals.create(yearly(GoalType.BOOKS, 30)), ConflictException.class, "goal.duplicated");
        assertCode(() -> goals.create(monthly(GoalType.BOOKS, 3, 5)), ConflictException.class, "goal.duplicated");
    }

    @Test
    void shouldAllowTheSameTypeInAnotherPeriodAndAnotherTypeInTheSamePeriod() {
        goals.create(yearly(GoalType.BOOKS, 24));
        goals.create(monthly(GoalType.BOOKS, 3, 2));
        goals.create(monthly(GoalType.BOOKS, 4, 2));
        goals.create(yearly(GoalType.PAGES, 6000));
        // A year that is over: the current one repeats the last monthly goal in its month.
        goals.create(new GoalRequest(GoalType.BOOKS, GoalPeriod.YEAR, YEAR - 1, null, 24));
        entityManager.flush();

        assertThat(goals.listByYear(YEAR)).hasSize(4);
        assertThat(goals.listByYear(YEAR - 1)).hasSize(1);
    }

    @Test
    void shouldRefuseRereadsByMonth() {
        assertCode(
                () -> goals.create(monthly(GoalType.REREADS, 3, 1)),
                BusinessRuleException.class,
                "goal.invalid-period");
    }

    @Test
    void shouldListTheYearlyGoalsFirstAndThenMonthByMonth() {
        goals.create(monthly(GoalType.PAGES, 11, 500));
        goals.create(monthly(GoalType.BOOKS, 3, 2));
        goals.create(yearly(GoalType.REREADS, 2));
        goals.create(yearly(GoalType.BOOKS, 24));
        entityManager.flush();

        assertThat(goals.listByYear(YEAR))
                .extracting(goal -> goal.type() + "/" + goal.month())
                .containsExactly("BOOKS/null", "REREADS/null", "BOOKS/3", "PAGES/11");
    }

    @Test
    void shouldListTheCurrentYearWhenNoneIsGiven() {
        int thisYear = Year.now().getValue();
        goals.create(new GoalRequest(GoalType.BOOKS, GoalPeriod.YEAR, thisYear, null, 24));
        goals.create(yearly(GoalType.BOOKS, 24));
        entityManager.flush();

        assertThat(goals.listByYear(null)).extracting(GoalResponse::year).containsExactly(thisYear);
    }

    @Test
    void shouldCountTheReadingsFinishedInThePeriodRereadsIncluded() {
        finished(hobbit, "2025-03-10", false);
        finished(hobbit, "2025-03-31", true);
        finished(dune, "2025-04-01", false);
        finished(dune, "2024-12-31", false);
        readings.create(
                withoutPages, new ReadingRequest(ReadingStatus.ABANDONED, null, LocalDate.parse("2025-03-15"), null));
        entityManager.flush();

        assertThat(goals.create(yearly(GoalType.BOOKS, 4)).current()).isEqualTo(3);
        assertThat(goals.create(monthly(GoalType.BOOKS, 3, 4)).current()).isEqualTo(2);
        assertThat(goals.create(yearly(GoalType.REREADS, 4)).current()).isEqualTo(1);
    }

    @Test
    void shouldCountThePagesOfTheSessionsOfThePeriod() {
        long reading = readings.create(
                        dune, new ReadingRequest(ReadingStatus.IN_PROGRESS, LocalDate.parse("2025-02-20"), null, null))
                .id();
        readings.addSession(reading, new SessionRequest(LocalDate.parse("2025-02-28"), 100, null, null));
        readings.addSession(reading, new SessionRequest(LocalDate.parse("2025-03-01"), 50, null, null));
        readings.addSession(reading, new SessionRequest(LocalDate.parse("2025-03-31"), 70, null, null));
        entityManager.flush();

        assertThat(goals.create(monthly(GoalType.PAGES, 3, 1000)).current()).isEqualTo(120);
        assertThat(goals.create(yearly(GoalType.PAGES, 1000)).current()).isEqualTo(220);
    }

    @Test
    void shouldCountThePagesLeftWhenAReadingIsFinishedWithoutSessionsForAllOfThem() {
        long reading = readings.create(
                        dune, new ReadingRequest(ReadingStatus.IN_PROGRESS, LocalDate.parse("2025-02-20"), null, null))
                .id();
        readings.addSession(reading, new SessionRequest(LocalDate.parse("2025-02-28"), 100, null, null));
        readings.finish(reading, LocalDate.parse("2025-03-05"));
        finished(hobbit, "2025-03-10", false);
        finished(withoutPages, "2025-03-11", false);
        entityManager.flush();

        // Duna: 500 pages closed in March; O Hobbit: 300, no session; the book without pages adds nothing.
        assertThat(goals.create(monthly(GoalType.PAGES, 3, 1000)).current()).isEqualTo(800);
        assertThat(goals.create(monthly(GoalType.PAGES, 2, 1000)).current()).isEqualTo(100);
    }

    @Test
    void shouldRoundThePercentDownAndStopAt100() {
        finished(hobbit, "2025-03-10", false);
        finished(dune, "2025-03-11", false);
        entityManager.flush();

        GoalResponse ofThree = goals.create(yearly(GoalType.BOOKS, 3));
        GoalResponse passed = goals.create(monthly(GoalType.BOOKS, 3, 1));

        assertThat(ofThree.percent()).isEqualTo(66);
        assertThat(passed.current()).isEqualTo(2);
        assertThat(passed.percent()).isEqualTo(100);
    }

    @Test
    void shouldChangeTheTargetAndRecalculate() {
        finished(hobbit, "2025-03-10", false);
        long id = goals.create(yearly(GoalType.BOOKS, 4)).id();

        GoalResponse changed = goals.changeTarget(id, 2);

        assertThat(changed.target()).isEqualTo(2);
        assertThat(changed.percent()).isEqualTo(50);
    }

    @Test
    void shouldTurnAGoalOffKeepingItsTarget() {
        long id = goals.create(yearly(GoalType.PAGES, 4000)).id();

        GoalResponse off = goals.update(id, 4000, false);
        GoalResponse untouched = goals.update(id, 3000, null);

        assertThat(off.enabled()).isFalse();
        assertThat(untouched.enabled()).isFalse();
        assertThat(untouched.target()).isEqualTo(3000);
        assertThat(goals.update(id, 3000, true).enabled()).isTrue();
    }

    @Test
    void shouldStartEveryGoalOn() {
        assertThat(goals.create(yearly(GoalType.BOOKS, 12)).enabled()).isTrue();
    }

    @Test
    void shouldRepeatTheLastMonthlyGoalInTheCurrentMonth() {
        YearMonth now = YearMonth.now(clock);
        YearMonth before = now.minusMonths(1);
        int year = before.getYear();
        int month = before.getMonthValue();
        long last = goals.create(new GoalRequest(GoalType.BOOKS, GoalPeriod.MONTH, year, month, 3)).id();
        goals.update(last, 3, false);
        entityManager.flush();

        List<GoalResponse> current = goals.listByYear(now.getYear());

        assertThat(current)
                .filteredOn(goal -> isMonthly(goal, now))
                .singleElement()
                .satisfies(goal -> {
                    assertThat(goal.type()).isEqualTo(GoalType.BOOKS);
                    assertThat(goal.target()).isEqualTo(3);
                    assertThat(goal.enabled()).isFalse();
                });
        assertThat(goals.listByYear(now.getYear())).hasSameSizeAs(current);
    }

    @Test
    void shouldNotRepeatMonthlyGoalsInAYearThatIsOver() {
        goals.create(monthly(GoalType.BOOKS, 3, 2));
        entityManager.flush();

        assertThat(goals.listByYear(YEAR)).hasSize(1);
    }

    @Test
    void shouldDeleteAGoal() {
        long id = goals.create(yearly(GoalType.BOOKS, 4)).id();

        goals.delete(id);
        entityManager.flush();

        assertThat(goals.listByYear(YEAR)).isEmpty();
    }

    @Test
    void shouldRefuseAnUnknownGoal() {
        assertCode(() -> goals.changeTarget(9_999, 2), NotFoundException.class, "goal.not-found");
        assertCode(() -> goals.delete(9_999), NotFoundException.class, "goal.not-found");
    }

    private void finished(long bookId, String endDate, boolean reread) {
        readings.create(bookId, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse(endDate), reread));
    }

    private static boolean isMonthly(GoalResponse goal, YearMonth month) {
        return goal.period() == GoalPeriod.MONTH && Integer.valueOf(month.getMonthValue()).equals(goal.month());
    }

    private static GoalRequest yearly(GoalType type, int target) {
        return new GoalRequest(type, GoalPeriod.YEAR, YEAR, null, target);
    }

    private static GoalRequest monthly(GoalType type, int month, int target) {
        return new GoalRequest(type, GoalPeriod.MONTH, YEAR, month, target);
    }

    private long book(String title, Integer pageCount, long author) {
        return books.create(new BookRequest(
                        title,
                        null,
                        null,
                        null,
                        pageCount,
                        null,
                        null,
                        null,
                        List.of(author),
                        null,
                        null,
                        null,
                        null,
                        Ownership.OWNED,
                        false))
                .id();
    }

    private static void assertCode(ThrowingCallable action, Class<? extends Throwable> type, String code) {
        assertThatThrownBy(action).isInstanceOf(type).extracting("code").isEqualTo(code);
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-goals-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
