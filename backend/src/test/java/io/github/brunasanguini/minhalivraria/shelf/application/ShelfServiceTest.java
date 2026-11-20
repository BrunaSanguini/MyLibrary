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
import io.github.brunasanguini.minhalivraria.lists.application.BookListRequest;
import io.github.brunasanguini.minhalivraria.lists.application.BookListService;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewService;
import io.github.brunasanguini.minhalivraria.reading.application.SessionRequest;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse.CardProgressResponse;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/** Runs against the real schema: every assertion here is the SQL of ShelfService answering. */
@SpringBootTest
@Transactional
class ShelfServiceTest {

    private static final PageQuery FIRST_PAGE = new PageQuery(null, null, null);
    private static final ShelfFilter EVERYTHING =
            new ShelfFilter(null, null, null, null, null, null, null, null, null, null);
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
    private ReadingService readings;

    @Autowired
    private ReviewService reviews;

    @Autowired
    private BookListService lists;

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
                        List.of(harper),
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
                        List.of(harper),
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
        List<Long> found = ids(EVERYTHING);

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
        assertThat(ids(new ShelfFilter(null, null, null, null, null, fantasy, null, null, null, null)))
                .containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(new ShelfFilter(null, null, null, null, null, highFantasy, null, null, null, null)))
                .containsExactly(fellowship);
        assertThat(ids(new ShelfFilter(null, null, null, null, null, sciFi, null, null, null, null)))
                .containsExactly(dune);
    }

    @Test
    void shouldFilterByOwnershipAndFavorite() {
        assertThat(ids(new ShelfFilter(null, null, Ownership.WISHLIST, null, null, null, null, null, null, null)))
                .containsExactly(dune);
        assertThat(ids(new ShelfFilter(null, null, null, true, null, null, null, null, null, null)))
                .containsExactly(fellowship);
        assertThat(ids(new ShelfFilter(null, null, null, false, null, null, null, null, null, null)))
                .containsExactlyInAnyOrder(hobbit, dune);
    }

    @Test
    void shouldFilterByAuthorPublisherAndSeries() {
        assertThat(ids(new ShelfFilter(null, null, null, null, null, null, tolkien, null, null, null)))
                .containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(new ShelfFilter(null, null, null, null, null, null, null, harper, null, null)))
                .containsExactlyInAnyOrder(fellowship, hobbit);
        assertThat(ids(new ShelfFilter(null, null, null, null, null, null, null, null, lotr, null)))
                .containsExactly(fellowship);
    }

    @Test
    void shouldCombineFiltersWithAnd() {
        ShelfFilter filter =
                new ShelfFilter("tolkien", null, Ownership.OWNED, false, null, fantasy, tolkien, harper, null, null);
        List<Long> found = ids(filter);

        assertThat(found).containsExactly(hobbit);
    }

    @Test
    void shouldSortByTitleIgnoringAccents() {
        List<Long> found = ids(EVERYTHING, "title,asc");

        assertThat(found).containsExactly(fellowship, dune, hobbit);
    }

    @Test
    void shouldSortByTheFirstAuthor() {
        List<Long> found = ids(EVERYTHING, "author,asc");

        assertThat(found).startsWith(dune);
    }

    @Test
    void shouldSortByNewestFirstByDefault() {
        List<Long> found = ids(EVERYTHING);

        assertThat(found).containsExactly(dune, hobbit, fellowship);
    }

    @Test
    void shouldPutBooksWithoutASeriesPositionLast() {
        List<Long> found = ids(EVERYTHING, "seriesPosition,asc");

        assertThat(found).startsWith(fellowship);
    }

    @Test
    void shouldFilterByListAndFollowTheOrderOfTheList() {
        long list =
                lists.create(new BookListRequest("Para as férias", null, null)).id();
        lists.addBook(list, dune);
        lists.addBook(list, fellowship);
        long other = lists.create(new BookListRequest("Clássicos", null, null)).id();
        lists.addBook(other, hobbit);
        lists.addBook(other, dune);
        entityManager.flush();

        assertThat(ids(inList(list), "listOrder,asc")).containsExactly(dune, fellowship);
        assertThat(ids(inList(list), "listOrder,desc")).containsExactly(fellowship, dune);
        assertThat(ids(inList(other), "listOrder,asc")).containsExactly(hobbit, dune);
        assertThat(shelf.search(inList(list), FIRST_PAGE).getTotalElements()).isEqualTo(2);
    }

    @Test
    void shouldCombineTheListWithTheOtherFilters() {
        long list =
                lists.create(new BookListRequest("Para as férias", null, null)).id();
        lists.addBook(list, dune);
        lists.addBook(list, fellowship);
        entityManager.flush();

        assertThat(ids(new ShelfFilter("duna", null, null, null, null, null, null, null, null, list)))
                .containsExactly(dune);
    }

    @Test
    void shouldRefuseTheOrderOfAListWithoutTheList() {
        assertThatThrownBy(() -> shelf.search(EVERYTHING, new PageQuery(null, null, "listOrder,asc")))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("request.invalid-sort");
    }

    @Test
    void shouldRefuseASortFieldOutsideTheList() {
        assertThatThrownBy(() -> shelf.search(
                        new ShelfFilter(null, null, null, null, null, null, null, null, null, null),
                        new PageQuery(null, null, "synopsis,asc")))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("request.invalid-sort");
    }

    @Test
    void shouldPaginateKeepingTheTotal() {
        var page = shelf.search(
                new ShelfFilter(null, null, null, null, null, null, null, null, null, null),
                new PageQuery(0, 2, "title,asc"));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getTotalPages()).isEqualTo(2);
    }

    @Test
    void shouldAnswerAnEmptyPagePastTheEnd() {
        var page = shelf.search(EVERYTHING, new PageQuery(5, 2, null));

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(3);
    }

    @Test
    void shouldFillTheCardOfABookInASeries() {
        var card = shelf.search(new ShelfFilter(null, null, null, null, null, null, null, null, lotr, null), FIRST_PAGE)
                .getContent()
                .getFirst();

        assertThat(card.title()).isEqualTo("A Sociedade do Anel");
        assertThat(card.authors()).containsExactly("J. R. R. Tolkien");
        assertThat(card.genres()).containsExactly("Alta fantasia");
        assertThat(card.ownership()).isEqualTo(Ownership.OWNED);
        assertThat(card.favorite()).isTrue();
        assertThat(card.coverUrl()).isNull();
        assertThat(card.status()).isEqualTo(ShelfStatus.WANT_TO_READ);
        assertThat(card.publishedYear()).isEqualTo((short) 2019);
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

    @Test
    void shouldCallABookWithoutReadingsWantToRead() {
        assertThat(card(hobbit).status()).isEqualTo(ShelfStatus.WANT_TO_READ);
        assertThat(card(hobbit).progress()).isNull();
        assertThat(card(hobbit).rating()).isNull();
    }

    @Test
    void shouldCallABookWithAReadingInProgressReading() {
        start(fellowship, "2026-11-01");

        assertThat(card(fellowship).status()).isEqualTo(ShelfStatus.READING);
    }

    @Test
    void shouldCallABookReadWhenItsLatestReadingWasFinished() {
        past(hobbit, ReadingStatus.ABANDONED, "2024-03-10");
        past(hobbit, ReadingStatus.FINISHED, "2025-06-20");

        assertThat(card(hobbit).status()).isEqualTo(ShelfStatus.READ);
    }

    @Test
    void shouldCallABookAbandonedWhenItsLatestReadingWasAbandoned() {
        past(hobbit, ReadingStatus.FINISHED, "2024-03-10");
        past(hobbit, ReadingStatus.ABANDONED, "2025-06-20");

        assertThat(card(hobbit).status()).isEqualTo(ShelfStatus.ABANDONED);
    }

    @Test
    void shouldLetAReadingInProgressWinOverTheFinishedOnes() {
        past(fellowship, ReadingStatus.FINISHED, "2025-06-20");
        start(fellowship, "2026-11-01");

        assertThat(card(fellowship).status()).isEqualTo(ShelfStatus.READING);
    }

    @Test
    void shouldBreakATieOfEndDatesByTheReadingRegisteredLast() {
        past(hobbit, ReadingStatus.FINISHED, "2025-06-20");
        past(hobbit, ReadingStatus.ABANDONED, "2025-06-20");
        past(dune, ReadingStatus.ABANDONED, "2025-06-20");
        past(dune, ReadingStatus.FINISHED, "2025-06-20");

        assertThat(card(hobbit).status()).isEqualTo(ShelfStatus.ABANDONED);
        assertThat(card(dune).status()).isEqualTo(ShelfStatus.READ);
    }

    @Test
    void shouldFilterByOneOrMoreStatuses() {
        start(fellowship, "2026-11-01");
        past(hobbit, ReadingStatus.FINISHED, "2025-06-20");

        assertThat(idsByStatus(ShelfStatus.READING)).containsExactly(fellowship);
        assertThat(idsByStatus(ShelfStatus.READ)).containsExactly(hobbit);
        assertThat(idsByStatus(ShelfStatus.WANT_TO_READ)).containsExactly(dune);
        assertThat(idsByStatus(ShelfStatus.ABANDONED)).isEmpty();
        assertThat(idsByStatus(ShelfStatus.READING, ShelfStatus.READ)).containsExactlyInAnyOrder(fellowship, hobbit);
    }

    @Test
    void shouldKeepTheTotalRightWhenFilteringByStatus() {
        start(fellowship, "2026-11-01");

        var page = shelf.search(byStatus(ShelfStatus.WANT_TO_READ), new PageQuery(0, 1, "title,asc"));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).hasSize(1);
    }

    @Test
    void shouldShowTheProgressOfTheReadingInProgress() {
        long reading = start(fellowship, "2026-11-01");
        readings.addSession(reading, new SessionRequest(LocalDate.parse("2026-11-02"), 100, null, null));
        readings.addSession(reading, new SessionRequest(LocalDate.parse("2026-11-03"), 20, null, null));
        entityManager.flush();

        assertThat(card(fellowship).progress()).isEqualTo(new CardProgressResponse(120, 576, 20));
        assertThat(card(fellowship).startedOn()).isEqualTo(LocalDate.parse("2026-11-01"));
        assertThat(card(hobbit).startedOn()).isNull();
    }

    @Test
    void shouldNotCountTheSessionsOfAFinishedReadingAsProgress() {
        long first = start(fellowship, "2025-01-01");
        readings.addSession(first, new SessionRequest(LocalDate.parse("2025-01-02"), 500, null, null));
        readings.finish(first, LocalDate.parse("2025-02-01"));
        start(fellowship, "2026-11-01");
        entityManager.flush();

        assertThat(card(fellowship).progress()).isEqualTo(new CardProgressResponse(0, 576, 0));
    }

    @Test
    void shouldSealAsRereadABookFinishedTwiceOrAReadingMarkedAsOne() {
        past(fellowship, ReadingStatus.FINISHED, "2024-03-01");
        past(fellowship, ReadingStatus.FINISHED, "2025-03-01");
        past(dune, ReadingStatus.FINISHED, "2025-06-01");

        assertThat(card(fellowship).reread()).isTrue();
        assertThat(card(dune).reread()).isFalse();
    }

    @Test
    void shouldFilterByReread() {
        past(fellowship, ReadingStatus.FINISHED, "2024-03-01");
        past(fellowship, ReadingStatus.FINISHED, "2025-03-01");
        past(dune, ReadingStatus.FINISHED, "2025-06-01");

        assertThat(ids(new ShelfFilter(null, null, null, null, true, null, null, null, null, null)))
                .containsExactly(fellowship);
        assertThat(ids(new ShelfFilter(null, null, null, null, false, null, null, null, null, null)))
                .containsExactlyInAnyOrder(hobbit, dune);
    }

    @Test
    void shouldShowProgressWithoutPercentWhenTheBookHasNoPageCount() {
        start(hobbit, "2026-11-01");

        assertThat(card(hobbit).progress()).isEqualTo(new CardProgressResponse(0, null, 0));
    }

    @Test
    void shouldShowTheRatingOfTheReview() {
        reviews.save(fellowship, new ReviewRequest(new BigDecimal("4.5"), null));
        reviews.save(hobbit, new ReviewRequest(null, "Ainda sem nota."));
        entityManager.flush();

        assertThat(card(fellowship).rating()).isEqualByComparingTo("4.5");
        assertThat(card(hobbit).rating()).isNull();
    }

    @Test
    void shouldSortByRatingLeavingTheUnratedLast() {
        reviews.save(hobbit, new ReviewRequest(new BigDecimal("5.0"), null));
        reviews.save(dune, new ReviewRequest(new BigDecimal("3.5"), null));
        entityManager.flush();

        assertThat(ids(EVERYTHING, "rating,desc")).containsExactly(hobbit, dune, fellowship);
    }

    @Test
    void shouldSortByTheDateTheBookWasLastFinished() {
        past(hobbit, ReadingStatus.FINISHED, "2025-06-20");
        past(dune, ReadingStatus.FINISHED, "2024-01-05");
        past(dune, ReadingStatus.FINISHED, "2026-02-01");
        past(fellowship, ReadingStatus.ABANDONED, "2026-10-01");

        assertThat(ids(EVERYTHING, "finishedAt,desc")).containsExactly(dune, hobbit, fellowship);
    }

    @Test
    void shouldListTheOtherBooksOfTheSeriesInTheOrderOfTheSeries() {
        long king = inSeries("O Retorno do Rei", "3.0");
        long towers = inSeries("As Duas Torres", "2.0");
        entityManager.flush();

        RelatedBooksResponse related = shelf.related(fellowship);

        assertThat(related.series()).extracting(BookCardResponse::id).containsExactly(towers, king);
        assertThat(related.similar()).isEmpty();
    }

    @Test
    void shouldListAsSimilarTheBooksWithMoreSubgenresInCommonFirst() {
        long epic = genres.create(new GenreRequest("Fantasia épica", fantasy)).id();
        long silmarillion = withGenres("O Silmarillion", List.of(highFantasy, epic));
        long eragon = withGenres("Eragon", List.of(highFantasy));
        long earthsea = withGenres("O Feiticeiro de Terramar", List.of(highFantasy, epic));
        withGenres("Neuromancer", List.of(sciFi));
        long target = withGenres("O Nome do Vento", List.of(highFantasy, epic, fantasy));
        entityManager.flush();

        RelatedBooksResponse related = shelf.related(target);

        // Two subgenres in common first, then one, each group by title. The root genre alone does not count.
        assertThat(related.similar())
                .extracting(BookCardResponse::id)
                .containsExactly(earthsea, silmarillion, fellowship, eragon);
        assertThat(related.series()).isEmpty();
    }

    @Test
    void shouldLeaveTheBooksOfTheSameSeriesOutOfTheSimilarOnes() {
        long towers = inSeries("As Duas Torres", "2.0");
        long eragon = withGenres("Eragon", List.of(highFantasy));
        entityManager.flush();

        RelatedBooksResponse related = shelf.related(fellowship);

        assertThat(related.series()).extracting(BookCardResponse::id).containsExactly(towers);
        assertThat(related.similar()).extracting(BookCardResponse::id).containsExactly(eragon);
    }

    @Test
    void shouldHaveNoRelatedBooksForABookWithoutSeriesAndSubgenres() {
        RelatedBooksResponse related = shelf.related(dune);

        assertThat(related.series()).isEmpty();
        assertThat(related.similar()).isEmpty();
    }

    @Test
    void shouldRefuseTheRelatedBooksOfAnUnknownBook() {
        assertThatThrownBy(() -> shelf.related(404))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("book.not-found");
    }

    private long start(long bookId, String startDate) {
        long id = readings.create(
                        bookId, new ReadingRequest(ReadingStatus.IN_PROGRESS, LocalDate.parse(startDate), null, null))
                .id();
        entityManager.flush();
        return id;
    }

    private void past(long bookId, ReadingStatus status, String endDate) {
        readings.create(bookId, new ReadingRequest(status, null, LocalDate.parse(endDate), null));
        entityManager.flush();
    }

    /** A volume of O Senhor dos Anéis, tagged like the first one. */
    private long inSeries(String title, String position) {
        return books.create(new BookRequest(
                        title,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(tolkien),
                        null,
                        List.of(highFantasy),
                        lotr,
                        new BigDecimal(position),
                        Ownership.NONE,
                        false))
                .id();
    }

    private long withGenres(String title, List<Long> genreIds) {
        return books.create(new BookRequest(
                        title,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(herbert),
                        null,
                        genreIds,
                        null,
                        null,
                        Ownership.NONE,
                        false))
                .id();
    }

    private BookCardResponse card(long bookId) {
        return shelf.search(EVERYTHING, new PageQuery(null, 100, null)).getContent().stream()
                .filter(card -> card.id() == bookId)
                .findFirst()
                .orElseThrow();
    }

    private List<Long> idsByStatus(ShelfStatus... statuses) {
        return ids(byStatus(statuses));
    }

    private static ShelfFilter byStatus(ShelfStatus... statuses) {
        return new ShelfFilter(null, List.of(statuses), null, null, null, null, null, null, null, null);
    }

    private static ShelfFilter inList(long listId) {
        return new ShelfFilter(null, null, null, null, null, null, null, null, null, listId);
    }

    private static ShelfFilter filterByTerm(String term) {
        return new ShelfFilter(term, null, null, null, null, null, null, null, null, null);
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
