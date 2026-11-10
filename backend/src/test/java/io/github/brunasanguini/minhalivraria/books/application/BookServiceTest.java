package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.books.domain.DuplicatedBookException;
import io.github.brunasanguini.minhalivraria.books.domain.Ownership;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class BookServiceTest {

    private static final Path DATA_DIR = tempDataDir();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private BookService service;

    @Autowired
    private AuthorService authors;

    @Autowired
    private PublisherService publishers;

    @Autowired
    private SeriesService series;

    @Autowired
    private GenreService genres;

    @Autowired
    private BookRepository books;

    @Test
    void shouldRegisterABookWithItsWholeCatalog() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        long harper =
                publishers.create(new PublisherRequest("HarperCollins Brasil")).id();
        long lotr = series.create(new SeriesRequest("O Senhor dos Anéis", 3)).id();
        long fantasy = genres.create(new GenreRequest("Fantasia", null)).id();

        BookDetailResponse created = service.create(new BookRequest(
                "A Sociedade do Anel",
                null,
                "9788595084742",
                null,
                576,
                (short) 2019,
                "por",
                "Uma jornada até a Montanha da Perdição.",
                List.of(tolkien),
                harper,
                List.of(fantasy),
                lotr,
                new BigDecimal("1.0"),
                Ownership.OWNED,
                true));

        assertThat(created.title()).isEqualTo("A Sociedade do Anel");
        assertThat(created.authors()).singleElement().extracting("name").isEqualTo("J. R. R. Tolkien");
        assertThat(created.publisher()).isNotNull().extracting("name").isEqualTo("HarperCollins Brasil");
        assertThat(created.series())
                .isNotNull()
                .extracting("name", "totalVolumes")
                .containsExactly("O Senhor dos Anéis", 3);
        assertThat(created.genres()).singleElement().extracting("name").isEqualTo("Fantasia");
        assertThat(created.ownership()).isEqualTo(Ownership.OWNED);
        assertThat(created.favorite()).isTrue();
        assertThat(created.openLibrary()).isNull();
        assertThat(created.coverUrl()).isNull();
    }

    @Test
    void shouldDefaultOwnershipAndFavoriteWhenTheFormOmitsThem() {
        BookDetailResponse created = service.create(request("Duna"));

        assertThat(created.ownership()).isEqualTo(Ownership.NONE);
        assertThat(created.favorite()).isFalse();
    }

    @Test
    void shouldRefuseADuplicatedIsbnPointingToTheExistingBook() {
        long existing = service.create(withIsbn("Duna", "9788595084742")).id();

        assertThatThrownBy(() -> service.create(withIsbn("Duna, outra edição", "978-85-9508-474-2")))
                .isInstanceOf(DuplicatedBookException.class)
                .extracting("code")
                .isEqualTo("book.isbn-duplicated");

        assertThatThrownBy(() -> service.create(withIsbn("Duna, outra edição", "9788595084742")))
                .extracting(thrown ->
                        ((DuplicatedBookException) thrown).extensions().get("bookId"))
                .isEqualTo(existing);
    }

    @Test
    void shouldLetTheBookKeepItsOwnIsbnOnUpdate() {
        long id = service.create(withIsbn("Duna", "9788595084742")).id();

        BookDetailResponse updated = service.update(id, withIsbn("Duna (edição revista)", "9788595084742"));

        assertThat(updated.title()).isEqualTo("Duna (edição revista)");
        assertThat(updated.isbn13()).isEqualTo("9788595084742");
    }

    @Test
    void shouldRefuseASeriesWithoutPosition() {
        long lotr = series.create(new SeriesRequest("O Senhor dos Anéis", 3)).id();

        assertThatThrownBy(() -> service.create(new BookRequest(
                        "As Duas Torres",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        lotr,
                        null,
                        null,
                        null)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("book.series-position-required");
    }

    @Test
    void shouldReportAnUnknownCatalogIdAsNotFound() {
        assertThatThrownBy(() -> service.create(new BookRequest(
                        "Duna",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(404L),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null)))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("author.not-found");
    }

    @Test
    void shouldReplaceTheCoverAndDiscardThePreviousImage() {
        long id = service.create(request("Duna")).id();

        CoverResponse first = service.replaceCover(id, ImageSamples.PNG);
        CoverResponse second = service.replaceCover(id, ImageSamples.JPEG);

        assertThat(first.coverUrl()).startsWith("/api/v1/images/");
        assertThat(second.coverUrl()).isNotEqualTo(first.coverUrl());
        assertThat(service.get(id).coverUrl()).isEqualTo(second.coverUrl());
    }

    @Test
    void shouldRemoveTheBanner() {
        long id = service.create(request("Duna")).id();
        service.replaceBanner(id, ImageSamples.WEBP);

        service.removeBanner(id);

        assertThat(service.get(id).bannerUrl()).isNull();
    }

    @Test
    void shouldToggleFavoriteAndOwnership() {
        long id = service.create(request("Duna")).id();

        service.markFavorite(id, true);
        service.changeOwnership(id, Ownership.WISHLIST);

        assertThat(service.get(id).favorite()).isTrue();
        assertThat(service.get(id).ownership()).isEqualTo(Ownership.WISHLIST);

        service.markFavorite(id, false);

        assertThat(service.get(id).favorite()).isFalse();
    }

    @Test
    void shouldDeleteTheBook() {
        long id = service.create(request("Duna")).id();
        service.replaceCover(id, ImageSamples.PNG);

        service.delete(id);

        assertThatThrownBy(() -> service.get(id))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("book.not-found");
    }

    @Test
    void shouldRefuseDeletingAnAuthorThatStillHasBooks() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        service.create(new BookRequest(
                "O Hobbit",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(tolkien),
                null,
                null,
                null,
                null,
                null,
                null));
        books.flush();

        assertThatThrownBy(() -> authors.delete(tolkien))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("author.has-books");
    }

    @Test
    void shouldClearSeriesAndPositionOfTheBooksWhenTheSeriesIsDeleted() {
        long lotr = series.create(new SeriesRequest("O Senhor dos Anéis", 3)).id();
        long id = service.create(new BookRequest(
                        "A Sociedade do Anel",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        lotr,
                        new BigDecimal("1.0"),
                        null,
                        null))
                .id();
        books.flush();

        series.delete(lotr);

        assertThat(service.get(id).series()).isNull();
    }

    private static BookRequest request(String title) {
        return new BookRequest(
                title, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    private static BookRequest withIsbn(String title, String isbn13) {
        return new BookRequest(
                title, null, isbn13, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-books-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
