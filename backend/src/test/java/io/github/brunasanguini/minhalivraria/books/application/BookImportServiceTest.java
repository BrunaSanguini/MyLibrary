package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.domain.DuplicatedBookException;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryAuthor;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryBook;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryCandidate;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryClient;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.error.ServiceUnavailableException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * Not transactional, unlike the other service tests: what happens to the cover when saving fails only shows when the
 * import really commits or rolls back. Each test cleans the tables it filled.
 */
@SpringBootTest
class BookImportServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final String EDITION = "OL29823759M";
    private static final String COVERS = "https://covers.openlibrary.org";
    private static final long COVER_ID = 14826646L;

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private BookImportService service;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private PublisherService publishers;

    @Autowired
    private SeriesService series;

    @Autowired
    private GenreService genres;

    @Autowired
    private JdbcClient jdbc;

    @MockitoBean
    private OpenLibraryClient openLibrary;

    @BeforeEach
    void openLibraryKnowsTheHobbit() {
        given(openLibrary.findEdition(EDITION)).willReturn(hobbit());
        given(openLibrary.downloadCover(COVER_ID)).willReturn(Optional.of(ImageSamples.JPEG));
        given(openLibrary.coverUrl(COVER_ID)).willReturn(COVERS + "/b/id/" + COVER_ID + "-M.jpg");
    }

    @AfterEach
    void emptyTheCollection() {
        for (String table : List.of("book_author", "book_genre", "book", "author", "publisher", "series", "image")) {
            jdbc.sql("delete from " + table).update();
        }
        jdbc.sql("delete from genre where parent_id is not null").update();
        jdbc.sql("delete from genre").update();
    }

    @Test
    void shouldImportAnEditionWithItsCoverAuthorsAndPublisher() {
        BookDetailResponse imported = service.importEdition(importOf(EDITION));

        assertThat(imported.title()).isEqualTo("O Hobbit");
        assertThat(imported.authors()).singleElement().extracting("name").isEqualTo("J.R.R. Tolkien");
        assertThat(imported.publisher()).isNotNull().extracting("name").isEqualTo("Harper Collins");
        assertThat(imported.isbn13()).isEqualTo("9788595084742");
        assertThat(imported.isbn10()).isEqualTo("8595084742");
        assertThat(imported.pageCount()).isEqualTo(336);
        assertThat(imported.publishedYear()).isEqualTo((short) 2019);
        assertThat(imported.languageCode()).isEqualTo("por");
        assertThat(imported.synopsis()).isEqualTo("Bilbo Bolseiro era um dos mais respeitáveis hobbits.");
        assertThat(imported.ownership()).isEqualTo(Ownership.NONE);
        assertThat(imported.favorite()).isFalse();
        assertThat(imported.coverUrl()).startsWith("/api/v1/images/");
        assertThat(imported.openLibrary())
                .isNotNull()
                .extracting("workKey", "editionKey", "url")
                .containsExactly("OL27482W", EDITION, "https://openlibrary.org/books/" + EDITION);
        assertThat(coverFiles()).hasSize(1);
        assertThat(books.get(imported.id()).title()).isEqualTo("O Hobbit");
    }

    @Test
    void shouldClassifyTheBookAlreadyOnImport() {
        long fantasy = genres.create(new GenreRequest("Fantasia", null)).id();
        long middleEarth = series.create(new SeriesRequest("Terra-média", null)).id();

        BookDetailResponse imported = service.importEdition(
                new ImportRequest(EDITION, Ownership.WISHLIST, List.of(fantasy), middleEarth, new BigDecimal("1.0")));

        assertThat(imported.ownership()).isEqualTo(Ownership.WISHLIST);
        assertThat(imported.genres()).singleElement().extracting("name").isEqualTo("Fantasia");
        assertThat(imported.series()).isNotNull().extracting("name").isEqualTo("Terra-média");
    }

    @Test
    void shouldReuseAuthorAndPublisherByNormalizedName() {
        long tolkien = authors.create(new AuthorRequest("j.r.r.  TOLKIEN")).id();
        long harper = publishers.create(new PublisherRequest("HARPER COLLINS")).id();

        BookDetailResponse imported = service.importEdition(importOf(EDITION));

        assertThat(imported.authors()).singleElement().extracting("id").isEqualTo(tolkien);
        assertThat(imported.publisher()).isNotNull().extracting("id").isEqualTo(harper);
        assertThat(count("author")).isEqualTo(1);
        assertThat(count("publisher")).isEqualTo(1);
    }

    @Test
    void shouldReuseTheAuthorOfAPreviousImportEvenAfterARename() {
        long tolkien = service.importEdition(importOf(EDITION)).authors().getFirst().id();
        authors.update(tolkien, new AuthorRequest("John Ronald Reuel Tolkien"));
        given(openLibrary.findEdition("OL7604539M")).willReturn(englishHobbit());

        BookDetailResponse second = service.importEdition(importOf("OL7604539M"));

        assertThat(second.authors()).singleElement().extracting("id").isEqualTo(tolkien);
        assertThat(second.coverUrl()).isNull();
        assertThat(count("author")).isEqualTo(1);
    }

    @Test
    void shouldRefuseTheSameEditionTwicePointingToTheBook() {
        long existing = service.importEdition(importOf(EDITION)).id();

        assertThatThrownBy(() -> service.importEdition(importOf(EDITION)))
                .isInstanceOf(DuplicatedBookException.class)
                .satisfies(thrown -> {
                    DuplicatedBookException duplicated = (DuplicatedBookException) thrown;
                    assertThat(duplicated.code()).isEqualTo("book.edition-duplicated");
                    assertThat(duplicated.extensions()).containsEntry("bookId", existing);
                });
        assertThat(count("book")).isEqualTo(1);
        assertThat(coverFiles()).hasSize(1);
    }

    @Test
    void shouldRefuseAnEditionWhoseIsbnIsAlreadyInTheCollection() {
        long author = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        long existing = books.create(new BookRequest(
                        "O Hobbit",
                        null,
                        "9788595084742",
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
                        null,
                        null))
                .id();

        assertThatThrownBy(() -> service.importEdition(importOf(EDITION)))
                .isInstanceOf(DuplicatedBookException.class)
                .satisfies(thrown -> {
                    DuplicatedBookException duplicated = (DuplicatedBookException) thrown;
                    assertThat(duplicated.code()).isEqualTo("book.isbn-duplicated");
                    assertThat(duplicated.extensions()).containsEntry("bookId", existing);
                });
        then(openLibrary).should(never()).downloadCover(anyLong());
    }

    @Test
    void shouldLeaveNoCoverBehindWhenSavingFails() {
        long unknownGenre = 404;

        assertThatThrownBy(() ->
                        service.importEdition(new ImportRequest(EDITION, null, List.of(unknownGenre), null, null)))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("genre.not-found");

        assertThat(coverFiles()).isEmpty();
        assertThat(count("image")).isZero();
        assertThat(count("book")).isZero();
        assertThat(count("author")).isZero();
        assertThat(count("publisher")).isZero();
    }

    @Test
    void shouldSaveNothingWhenTheCoverCannotBeDownloaded() {
        given(openLibrary.downloadCover(COVER_ID))
                .willThrow(new ServiceUnavailableException("openlibrary.unavailable"));

        assertThatThrownBy(() -> service.importEdition(importOf(EDITION)))
                .isInstanceOf(ServiceUnavailableException.class);

        assertThat(count("book")).isZero();
    }

    @Test
    void shouldImportWithoutCoverWhenTheOpenLibraryHasNone() {
        given(openLibrary.downloadCover(COVER_ID)).willReturn(Optional.empty());

        BookDetailResponse imported = service.importEdition(importOf(EDITION));

        assertThat(imported.coverUrl()).isNull();
        assertThat(coverFiles()).isEmpty();
    }

    @Test
    void shouldPreviewAnEditionWithoutSavingAnything() {
        ImportPreviewResponse preview = service.previewByEdition(EDITION);

        assertThat(preview.editionKey()).isEqualTo(EDITION);
        assertThat(preview.title()).isEqualTo("O Hobbit");
        assertThat(preview.authors()).containsExactly("J.R.R. Tolkien");
        assertThat(preview.publisher()).isEqualTo("Harper Collins");
        assertThat(preview.coverUrl()).isEqualTo(COVERS + "/b/id/" + COVER_ID + "-M.jpg");
        assertThat(preview.libraryBookId()).isNull();
        assertThat(count("book")).isZero();
        then(openLibrary).should(never()).downloadCover(anyLong());
    }

    @Test
    void shouldTellThePreviewThatTheEditionIsAlreadyInTheCollection() {
        given(openLibrary.findByIsbn("9788595084742")).willReturn(hobbit());
        long existing = service.importEdition(importOf(EDITION)).id();

        assertThat(service.previewByIsbn("9788595084742").libraryBookId()).isEqualTo(existing);
    }

    @Test
    void shouldMarkTheSearchResultsThatAreAlreadyInTheCollection() {
        long existing = service.importEdition(importOf(EDITION)).id();
        given(openLibrary.search("hobbit"))
                .willReturn(List.of(
                        new OpenLibraryCandidate(
                                EDITION, "OL27482W", "O Hobbit", List.of("J.R.R. Tolkien"), (short) 2019, COVER_ID),
                        new OpenLibraryCandidate(
                                "OL33891995M", "OL27455W", "The Annotated Hobbit", List.of(), null, null)));

        List<ImportCandidateResponse> candidates = service.search("hobbit");

        assertThat(candidates)
                .extracting(ImportCandidateResponse::editionKey, ImportCandidateResponse::libraryBookId)
                .containsExactly(
                        tuple(EDITION, existing),
                        tuple("OL33891995M", null));
        assertThat(candidates.getFirst().coverUrl()).isEqualTo(COVERS + "/b/id/" + COVER_ID + "-M.jpg");
        assertThat(candidates.getLast().coverUrl()).isNull();
    }

    private static ImportRequest importOf(String editionKey) {
        return new ImportRequest(editionKey, null, null, null, null);
    }

    private static OpenLibraryBook hobbit() {
        return new OpenLibraryBook(
                EDITION,
                "OL27482W",
                "O Hobbit",
                null,
                List.of(new OpenLibraryAuthor("OL26320A", "J.R.R. Tolkien")),
                "Harper Collins",
                336,
                "9788595084742",
                "8595084742",
                (short) 2019,
                "por",
                "Bilbo Bolseiro era um dos mais respeitáveis hobbits.",
                COVER_ID);
    }

    /** Another edition of the same author, without cover. */
    private static OpenLibraryBook englishHobbit() {
        return new OpenLibraryBook(
                "OL7604539M",
                "OL27482W",
                "The Hobbit",
                "or there and back again",
                List.of(new OpenLibraryAuthor("OL26320A", "J.R.R. Tolkien")),
                "Houghton Mifflin",
                320,
                "9780618260300",
                "0618260307",
                (short) 2021,
                "eng",
                null,
                null);
    }

    private long count(String table) {
        return jdbc.sql("select count(*) from " + table).query(Long.class).single();
    }

    private static List<Path> coverFiles() {
        Path covers = DATA_DIR.resolve("images").resolve("cover");
        if (!Files.exists(covers)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(covers)) {
            return files.filter(Files::isRegularFile).toList();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-import-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
