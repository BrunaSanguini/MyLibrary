package io.github.brunasanguini.minhalivraria.reading.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReviewServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final PageRequest LATEST_FIRST = PageRequest.of(0, 24, Sort.by(Sort.Direction.DESC, "updatedAt"));

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ReviewService reviews;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private ReadingService readings;

    @Autowired
    private EntityManager entityManager;

    private long fellowship;
    private long hobbit;

    @BeforeEach
    void books() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        fellowship = book("A Sociedade do Anel", tolkien);
        hobbit = book("O Hobbit", tolkien);
    }

    @Test
    void shouldCreateTheReviewOfABook() {
        SavedReview saved = reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), "  Um clássico.  "));

        assertThat(saved.created()).isTrue();
        assertThat(saved.review().bookId()).isEqualTo(fellowship);
        assertThat(saved.review().rating()).isEqualByComparingTo("4.5");
        assertThat(saved.review().content()).isEqualTo("Um clássico.");
        assertThat(saved.review().updatedAt()).isNotNull();
    }

    @Test
    void shouldRewriteTheReviewTheBookAlreadyHas() {
        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), "Um clássico."));

        SavedReview saved = reviews.save(fellowship, new ReviewRequest(new BigDecimal("5.0"), null));

        assertThat(saved.created()).isFalse();
        assertThat(reviews.get(fellowship).rating()).isEqualByComparingTo("5.0");
        assertThat(reviews.get(fellowship).content()).isNull();
        assertThat(reviews.latest(LATEST_FIRST).getTotalElements()).isEqualTo(1);
    }

    @Test
    void shouldKeepTheRatingOnTheLatestReadingOnly() {
        long first = readings.create(
                        fellowship,
                        new ReadingRequest(
                                ReadingStatus.FINISHED, LocalDate.of(2025, 1, 2), LocalDate.of(2025, 2, 1), false))
                .id();
        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.0"), null));
        long second = readings.create(
                        fellowship,
                        new ReadingRequest(
                                ReadingStatus.FINISHED, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 4, 1), true))
                .id();

        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), "Melhor na releitura."));
        entityManager.flush();
        entityManager.clear();

        List<ReadingResponse> history = readings.listByBook(fellowship);
        assertThat(history).extracting(ReadingResponse::id).containsExactly(second, first);
        assertThat(history.get(0).rating()).isEqualByComparingTo("4.5");
        assertThat(history.get(1).rating()).isEqualByComparingTo("4.0");

        reviews.delete(fellowship);
        entityManager.flush();
        entityManager.clear();
        assertThat(readings.listByBook(fellowship).get(0).rating()).isNull();
        assertThat(readings.listByBook(fellowship).get(1).rating()).isEqualByComparingTo("4.0");
    }

    @Test
    void shouldAcceptAReviewWithOnlyTheTextOrOnlyTheRating() {
        assertThat(reviews.save(fellowship, new ReviewRequest(null, "Sem nota ainda."))
                        .review()
                        .rating())
                .isNull();
        assertThat(reviews.save(hobbit, new ReviewRequest(new BigDecimal("3.0"), "   "))
                        .review()
                        .content())
                .isNull();
    }

    @Test
    void shouldRefuseAReviewWithoutRatingAndWithoutText() {
        assertThatThrownBy(() -> reviews.save(fellowship, new ReviewRequest(null, "  ")))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("review.empty");
    }

    @Test
    void shouldTellABookWithoutReviewFromAnUnknownBook() {
        assertThatThrownBy(() -> reviews.get(fellowship))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("review.not-found");
        assertThatThrownBy(() -> reviews.get(404))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("book.not-found");
        assertThatThrownBy(() -> reviews.save(404, new ReviewRequest(new BigDecimal("4.0"), null)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void shouldDeleteTheReviewAndAcceptDeletingWhatIsNotThere() {
        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), null));

        reviews.delete(fellowship);
        reviews.delete(fellowship);
        entityManager.flush();

        assertThatThrownBy(() -> reviews.get(fellowship)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void shouldListTheLatestReviewsWithTheBookOfEach() {
        books.replaceCover(fellowship, ImageSamples.JPEG);
        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), "Um clássico."));
        reviews.save(hobbit, new ReviewRequest(null, "Lá e de volta outra vez."));
        entityManager.flush();

        Page<ReviewSummaryResponse> latest = reviews.latest(LATEST_FIRST);

        assertThat(latest.getContent())
                .extracting(ReviewSummaryResponse::title)
                .containsExactlyInAnyOrder("A Sociedade do Anel", "O Hobbit");
        ReviewSummaryResponse ofFellowship = latest.getContent().stream()
                .filter(review -> review.bookId() == fellowship)
                .findFirst()
                .orElseThrow();
        assertThat(ofFellowship.coverUrl()).startsWith("/api/v1/images/");
        assertThat(ofFellowship.rating()).isEqualByComparingTo("4.5");
        assertThat(ofFellowship.excerpt()).isEqualTo("Um clássico.");
    }

    @Test
    void shouldLoseTheReviewWhenTheBookIsDeleted() {
        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), null));
        entityManager.flush();
        entityManager.clear();

        books.delete(fellowship);
        entityManager.flush();
        entityManager.clear();

        assertThat(reviews.latest(LATEST_FIRST)).isEmpty();
    }

    @Test
    void shouldCutALongTextAtAWordForTheExcerpt() {
        String longText = "palavra ".repeat(60).strip();

        String excerpt = ReviewService.excerpt(longText);

        assertThat(excerpt).hasSizeLessThanOrEqualTo(241).endsWith("palavra…");
        assertThat(ReviewService.excerpt("Curto.")).isEqualTo("Curto.");
        assertThat(ReviewService.excerpt(null)).isNull();
    }

    @Test
    void shouldCutALongTextWithoutSpacesAtTheLimit() {
        assertThat(ReviewService.excerpt("a".repeat(300))).isEqualTo("a".repeat(240) + "…");
    }

    private long book(String title, long author) {
        return books.create(new BookRequest(
                        title,
                        null,
                        null,
                        null,
                        null,
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

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-review-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
