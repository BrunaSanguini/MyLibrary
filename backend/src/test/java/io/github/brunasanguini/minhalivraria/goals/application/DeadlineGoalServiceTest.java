package io.github.brunasanguini.minhalivraria.goals.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.books.application.GenreRequest;
import io.github.brunasanguini.minhalivraria.books.application.GenreService;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.reading.application.SessionRequest;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.jspecify.annotations.Nullable;
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
class DeadlineGoalServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final LocalDate MARCH_1 = LocalDate.parse("2025-03-01");
    private static final LocalDate AUGUST_31 = LocalDate.parse("2025-08-31");

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private DeadlineGoalService goals;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private GenreService genres;

    @Autowired
    private ReadingService readings;

    @Autowired
    private EntityManager entityManager;

    private long nonFiction;
    private long fantasy;
    private long sapiens;
    private long biography;
    private long hobbit;

    @BeforeEach
    void books() {
        long author = authors.create(new AuthorRequest("Autora")).id();
        nonFiction = genres.create(new GenreRequest("Não ficção", null)).id();
        long biographies = genres.create(new GenreRequest("Biografia", nonFiction)).id();
        fantasy = genres.create(new GenreRequest("Fantasia", null)).id();
        sapiens = book("Sapiens", 400, author, nonFiction);
        biography = book("Steve Jobs", 600, author, biographies);
        hobbit = book("O Hobbit", 300, author, fantasy);
    }

    @Test
    void shouldCountEveryBookFinishedBetweenTheDatesWhenThereIsNoGenre() {
        finished(sapiens, "2025-03-01");
        finished(hobbit, "2025-08-31");
        finished(biography, "2025-09-01");

        DeadlineGoalResponse goal = goals.create(booksBetweenMarchAndAugust(4, null));

        assertThat(goal.current()).isEqualTo(2);
        assertThat(goal.percent()).isEqualTo(50);
        assertThat(goal.genre()).isNull();
    }

    @Test
    void shouldCountOnlyTheBooksOfTheGenreAndOfItsSubgenres() {
        finished(sapiens, "2025-04-10");
        finished(biography, "2025-05-20");
        finished(hobbit, "2025-06-30");

        DeadlineGoalResponse goal = goals.create(booksBetweenMarchAndAugust(2, nonFiction));

        assertThat(goal.current()).isEqualTo(2);
        assertThat(goal.percent()).isEqualTo(100);
        assertThat(goal.genre()).isEqualTo(new GoalGenre(nonFiction, "Não ficção"));
    }

    @Test
    void shouldCountThePagesOfTheGenreOnly() {
        LocalDate march2 = LocalDate.parse("2025-03-02");
        long reading = readings.create(sapiens, new ReadingRequest(ReadingStatus.IN_PROGRESS, march2, null, null)).id();
        readings.addSession(reading, new SessionRequest(march2, 120, null, null));
        finished(hobbit, "2025-04-01");

        DeadlineGoalResponse goal =
                goals.create(new DeadlineGoalRequest(GoalType.PAGES, 1000, MARCH_1, AUGUST_31, nonFiction));

        assertThat(goal.current()).isEqualTo(120);
        assertThat(goal.percent()).isEqualTo(12);
    }

    @Test
    void shouldCountNothingForAGenreWithoutBooks() {
        long poetry = genres.create(new GenreRequest("Poesia", null)).id();
        finished(sapiens, "2025-04-10");

        assertThat(goals.create(booksBetweenMarchAndAugust(1, poetry)).current()).isZero();
    }

    @Test
    void shouldAcceptAGoalOfASingleDay() {
        finished(sapiens, "2025-03-01");

        DeadlineGoalRequest oneDay = new DeadlineGoalRequest(GoalType.BOOKS, 1, MARCH_1, MARCH_1, null);

        assertThat(goals.create(oneDay).current()).isEqualTo(1);
    }

    @Test
    void shouldRefuseAnEndBeforeTheStart() {
        assertCode(
                () -> goals.create(new DeadlineGoalRequest(GoalType.BOOKS, 1, AUGUST_31, MARCH_1, null)),
                BusinessRuleException.class,
                "goal.invalid-dates");
    }

    @Test
    void shouldRefuseAGenreThatDoesNotExist() {
        DeadlineGoalRequest unknownGenre = booksBetweenMarchAndAugust(1, 9999L);

        assertCode(() -> goals.create(unknownGenre), NotFoundException.class, "genre.not-found");
    }

    @Test
    void shouldReplaceEverythingInTheGoal() {
        finished(hobbit, "2025-10-05");
        long id = goals.create(booksBetweenMarchAndAugust(2, nonFiction)).id();

        DeadlineGoalRequest lastQuarter = new DeadlineGoalRequest(
                GoalType.BOOKS, 1, LocalDate.parse("2025-10-01"), LocalDate.parse("2025-12-31"), fantasy);
        DeadlineGoalResponse changed = goals.update(id, lastQuarter);

        assertThat(changed.startDate()).isEqualTo(LocalDate.parse("2025-10-01"));
        assertThat(changed.genre()).isEqualTo(new GoalGenre(fantasy, "Fantasia"));
        assertThat(changed.current()).isEqualTo(1);
    }

    @Test
    void shouldListTheGoalThatEndsFirstFirst() {
        DeadlineGoalRequest nextYear = new DeadlineGoalRequest(
                GoalType.BOOKS, 20, LocalDate.parse("2027-01-01"), LocalDate.parse("2027-12-31"), null);
        long later = goals.create(nextYear).id();
        long sooner = goals.create(booksBetweenMarchAndAugust(2, null)).id();

        assertThat(goals.list()).extracting(DeadlineGoalResponse::id).containsExactly(sooner, later);
    }

    @Test
    void shouldDeleteAGoal() {
        long id = goals.create(booksBetweenMarchAndAugust(2, null)).id();

        goals.delete(id);

        assertThat(goals.list()).isEmpty();
        assertCode(() -> goals.delete(id), NotFoundException.class, "goal.not-found");
    }

    @Test
    void shouldGoAwayWithItsGenre() {
        goals.create(booksBetweenMarchAndAugust(1, fantasy));
        entityManager.flush();

        genres.delete(fantasy);
        entityManager.flush();
        entityManager.clear();

        assertThat(goals.list()).isEmpty();
    }

    private static DeadlineGoalRequest booksBetweenMarchAndAugust(int target, @Nullable Long genreId) {
        return new DeadlineGoalRequest(GoalType.BOOKS, target, MARCH_1, AUGUST_31, genreId);
    }

    private void finished(long bookId, String endDate) {
        readings.create(bookId, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse(endDate), false));
    }

    private long book(String title, Integer pageCount, long author, long genre) {
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
                        List.of(genre),
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
            return Files.createTempDirectory("minha-livraria-deadline-goals-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
