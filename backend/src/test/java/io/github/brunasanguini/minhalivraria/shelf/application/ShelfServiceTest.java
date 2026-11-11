package io.github.brunasanguini.minhalivraria.shelf.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.books.application.GenreRequest;
import io.github.brunasanguini.minhalivraria.books.application.GenreService;
import io.github.brunasanguini.minhalivraria.books.application.PublisherRequest;
import io.github.brunasanguini.minhalivraria.books.application.PublisherService;
import io.github.brunasanguini.minhalivraria.books.application.SeriesRequest;
import io.github.brunasanguini.minhalivraria.books.application.SeriesService;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/** Runs against the real schema: every assertion here is the SQL of ShelfService answering. */
@SpringBootTest
@Transactional
class ShelfServiceTest {

    private static final PageQuery FIRST_PAGE = new PageQuery(null, null, null);
    private static final Path DATA_DIR = tempDataDir();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ShelfService shelf;

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
    private EntityManager entityManager;

    private long tolkien;
    private long herbert;
    private long harper;
    private long lotr;
    private long fantasy;
    private long highFantasy;
    private long sciFi;
    private long fellowship;
    private long hobbit;
    private long dune;

    @BeforeEach
    void catalog() {
        tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        herbert = authors.create(new AuthorRequest("Frank Herbert")).id();
        harper = publishers.create(new PublisherRequest("HarperCollins Brasil")).id();
        lotr = series.create(new SeriesRequest("O Senhor dos Anéis", 3)).id();
        fantasy = genres.create(new GenreRequest("Fantasia", null)).id();
        highFantasy = genres.create(new GenreRequest("Alta fantasia", fantasy)).id();
        sciFi = genres.create(new GenreRequest("Ficção científica", null)).id();

        fellowship = books.create(new BookRequest(
                        "A Sociedade do Anel",
                        "O Senhor dos Anéis",
                        null,
                        null,
                        576,
                        (short) 2019,
                        "por",
                        null,
                        List.of(tolkien),
                        harper,
                        List.of(highFantasy),
                        lotr,
                        new BigDecimal("1.0"),
                        Ownership.OWNED,
                        true))
                .id();
        hobbit = books.create(new BookRequest(
                        "O Hobbit",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(tolkien),
                        harper,
                        List.of(fantasy),
                        null,
                        null,
                        Ownership.OWNED,
                        false))
                .id();
        dune = books.create(new BookRequest(
                        "Duna",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(herbert),
                        null,
                        List.of(sciFi),
                        null,
                        null,
                        Ownership.WISHLIST,
                        false))
                .id();

        // The shelf reads the tables with SQL, so the pending inserts have to reach the database first.
        entityManager.flush();
    }

    @Test
    void shouldFindTheWholeShelfByDefault() {
        List<Long> found = ids(new ShelfFilter(null, null, null, null, null, null, null));

        assertThat(found).containsExactlyInAnyOrder(fellowship, hobbit, dune);
    }

    @Test
    void shouldFindATitleIgnoringAccents() {
        assertThat(ids(filterByTerm("aneis"))).containsExactly(fellowship);
        assertThat(ids(filterByTerm("ANÉIS"))).containsExactly(fellowship);
    }

    @Test
    void shouldFindBySubtitle() {
        assertThat(ids(filterByTerm("senhor dos aneis"))).containsExactly(fellowship);
    }

    @Test
    void shouldFindByAuthorName() {
        assertThat(ids(filterByTerm("tolkien"))).containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(filterByTerm("herbert"))).containsExactly(dune);
    }

    @Test
    void shouldTreatWildcardsInTheTermAsText() {
        assertThat(ids(filterByTerm("%"))).isEmpty();
        assertThat(ids(filterByTerm("dun_"))).isEmpty();
    }

    @Test
    void shouldBringTheBooksOfTheSubgenresOfAGenre() {
        assertThat(ids(new ShelfFilter(null, null, null, fantasy, null, null, null)))
                .containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(new ShelfFilter(null, null, null, highFantasy, null, null, null)))
                .containsExactly(fellowship);
        assertThat(ids(new ShelfFilter(null, null, null, sciFi, null, null, null)))
                .containsExactly(dune);
    }

    @Test
    void shouldFilterByOwnershipAndFavorite() {
        assertThat(ids(new ShelfFilter(null, Ownership.WISHLIST, null, null, null, null, null)))
                .containsExactly(dune);
        assertThat(ids(new ShelfFilter(null, null, true, null, null, null, null)))
                .containsExactly(fellowship);
        assertThat(ids(new ShelfFilter(null, null, false, null, null, null, null)))
                .containsExactlyInAnyOrder(hobbit, dune);
    }

    @Test
    void shouldFilterByAuthorPublisherAndSeries() {
        assertThat(ids(new ShelfFilter(null, null, null, null, tolkien, null, null)))
                .containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(new ShelfFilter(null, null, null, null, null, harper, null)))
                .containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(new ShelfFilter(null, null, null, null, null, null, lotr)))
                .containsExactly(fellowship);
    }

    @Test
    void shouldCombineFiltersWithAnd() {
        List<Long> found = ids(new ShelfFilter("tolkien", Ownership.OWNED, false, fantasy, tolkien, harper, null));

        assertThat(found).containsExactly(hobbit);
    }

    @Test
    void shouldSortByTitleIgnoringAccents() {
        List<Long> found = ids(new ShelfFilter(null, null, null, null, null, null, null), "title,asc");

        assertThat(found).containsExactly(fellowship, dune, hobbit);
    }

    @Test
    void shouldSortByTheFirstAuthor() {
        List<Long> found = ids(new ShelfFilter(null, null, null, null, null, null, null), "author,asc");

        assertThat(found).startsWith(dune);
    }

    @Test
    void shouldSortByNewestFirstByDefault() {
        List<Long> found = ids(new ShelfFilter(null, null, null, null, null, null, null));

        assertThat(found).containsExactly(dune, hobbit, fellowship);
    }

    @Test
    void shouldPutBooksWithoutASeriesPositionLast() {
        List<Long> found = ids(new ShelfFilter(null, null, null, null, null, null, null), "seriesPosition,asc");

        assertThat(found).startsWith(fellowship);
    }

    @Test
    void shouldRefuseASortFieldOutsideTheList() {
        assertThatThrownBy(() -> shelf.search(
                        new ShelfFilter(null, null, null, null, null, null, null),
                        new PageQuery(null, null, "synopsis,asc")))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("request.invalid-sort");
    }

    @Test
    void shouldPaginateKeepingTheTotal() {
        var page = shelf.search(
                new ShelfFilter(null, null, null, null, null, null, null), new PageQuery(0, 2, "title,asc"));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getTotalPages()).isEqualTo(2);
    }

    @Test
    void shouldAnswerAnEmptyPagePastTheEnd() {
        var page = shelf.search(new ShelfFilter(null, null, null, null, null, null, null), new PageQuery(5, 2, null));

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(3);
    }

    @Test
    void shouldFillTheCardOfABookInASeries() {
        var card = shelf.search(new ShelfFilter(null, null, null, null, null, null, lotr), FIRST_PAGE)
                .getContent()
                .getFirst();

        assertThat(card.title()).isEqualTo("A Sociedade do Anel");
        assertThat(card.authors()).containsExactly("J. R. R. Tolkien");
        assertThat(card.genres()).containsExactly("Alta fantasia");
        assertThat(card.ownership()).isEqualTo(Ownership.OWNED);
        assertThat(card.favorite()).isTrue();
        assertThat(card.coverUrl()).isNull();
        assertThat(card.series()).isNotNull().satisfies(found -> {
            assertThat(found.id()).isEqualTo(lotr);
            assertThat(found.name()).isEqualTo("O Senhor dos Anéis");
            assertThat(found.position()).isEqualByComparingTo("1.0");
        });
    }

    @Test
    void shouldLeaveTheSeriesNullOnABookWithoutOne() {
        var card = shelf.search(filterByTerm("duna"), FIRST_PAGE).getContent().getFirst();

        assertThat(card.series()).isNull();
        assertThat(card.authors()).containsExactly("Frank Herbert");
    }

    @Test
    void shouldKeepTheOrderTheAuthorsWerePrintedIn() {
        long adams = authors.create(new AuthorRequest("Douglas Adams")).id();
        books.create(new BookRequest(
                "Guia do Mochileiro",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(adams, tolkien),
                null,
                null,
                null,
                null,
                null,
                null));
        entityManager.flush();

        var card = shelf.search(filterByTerm("mochileiro"), FIRST_PAGE)
                .getContent()
                .getFirst();

        assertThat(card.authors()).containsExactly("Douglas Adams", "J. R. R. Tolkien");
    }

    @Test
    void shouldShowTheCoverUrlWhenTheBookHasOne() {
        String url = books.replaceCover(hobbit, ImageSamples.PNG).coverUrl();
        entityManager.flush();

        var card = shelf.search(filterByTerm("hobbit"), FIRST_PAGE).getContent().getFirst();

        assertThat(card.coverUrl()).isEqualTo(url);
    }

    private static ShelfFilter filterByTerm(String term) {
        return new ShelfFilter(term, null, null, null, null, null, null);
    }

    private List<Long> ids(ShelfFilter filter) {
        return ids(filter, null);
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-shelf-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private List<Long> ids(ShelfFilter filter, String sort) {
        return shelf.search(filter, new PageQuery(null, null, sort)).getContent().stream()
                .map(BookCardResponse::id)
                .toList();
    }
}
