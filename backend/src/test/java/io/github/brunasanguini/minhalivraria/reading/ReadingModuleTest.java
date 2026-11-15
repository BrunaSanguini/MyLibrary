package io.github.brunasanguini.minhalivraria.reading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingResponse;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewService;
import io.github.brunasanguini.minhalivraria.reading.application.SessionRequest;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * Starts the reading module with what it depends on (books and, through it, images) and nothing else: the shelf, the
 * lists and the goals stay out. If reading ever reached for one of them, this context would not start.
 */
@ApplicationModuleTest(mode = BootstrapMode.ALL_DEPENDENCIES)
@Transactional
class ReadingModuleTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final LocalDate NOV_1 = LocalDate.parse("2026-11-01");

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ReadingService readings;

    @Autowired
    private ReviewService reviews;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldStartWithoutTheModulesThatDependOnIt() {
        assertThat(context.getBeanNamesForType(ReadingService.class)).hasSize(1);
        assertThat(context.getBeanDefinitionNames())
                .noneMatch(name -> name.toLowerCase(Locale.ROOT).contains("shelf"));
    }

    @Test
    void shouldFollowAReadingFromTheFirstPageToTheReview() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        long hobbit = books.create(new BookRequest(
                        "O Hobbit",
                        null,
                        null,
                        null,
                        336,
                        null,
                        null,
                        null,
                        List.of(tolkien),
                        null,
                        null,
                        null,
                        null,
                        Ownership.OWNED,
                        false))
                .id();

        ReadingResponse reading =
                readings.create(hobbit, new ReadingRequest(ReadingStatus.IN_PROGRESS, NOV_1, null, null));
        assertThatThrownBy(
                        () -> readings.create(hobbit, new ReadingRequest(ReadingStatus.IN_PROGRESS, NOV_1, null, null)))
                .isInstanceOf(ConflictException.class);

        readings.addSession(reading.id(), new SessionRequest(NOV_1, 100, null, null));
        assertThat(readings.addSession(reading.id(), new SessionRequest(NOV_1.plusDays(1), null, 336, null))
                        .pagesRead())
                .isEqualTo(236);

        ReadingResponse finished = readings.finish(reading.id(), NOV_1.plusDays(1));
        assertThat(finished.status()).isEqualTo(ReadingStatus.FINISHED);
        assertThat(finished.progress().percent()).isEqualTo(100);
        assertThat(finished.sessionCount()).isEqualTo(2);

        assertThat(reviews.save(hobbit, new ReviewRequest(new BigDecimal("5.0"), "Lá e de volta outra vez."))
                        .created())
                .isTrue();
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-reading-module-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
