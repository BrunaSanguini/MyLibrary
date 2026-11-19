package io.github.brunasanguini.minhalivraria.lists.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.lists.domain.ListColor;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReadingService;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class BookListServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final PageRequest BY_NAME = PageRequest.of(0, 20, Sort.by("normalizedName"));
    private static final OffsetDateTime LONG_AGO = OffsetDateTime.parse("2020-01-01T00:00:00Z");

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private BookListService lists;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private ReadingService readings;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcClient jdbc;

    private long tolkien;
    private long fellowship;
    private long hobbit;
    private long dune;

    @BeforeEach
    void books() {
        tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        fellowship = book("A Sociedade do Anel", tolkien);
        hobbit = book("O Hobbit", tolkien);
        dune = book("Duna", tolkien);
    }

    @Test
    void shouldCreateAnEmptyList() {
        BookListResponse list = lists.create(new BookListRequest("Para as férias", "Leituras leves", null));

        assertThat(list.name()).isEqualTo("Para as férias");
        assertThat(list.description()).isEqualTo("Leituras leves");
        assertThat(list.bookCount()).isZero();
        assertThat(list.readCount()).isZero();
        assertThat(list.coverUrls()).isEmpty();
        assertThat(list.updatedAt()).isNotNull();
        assertThat(list.color()).isEqualTo(ListColor.PLUM);
        assertThat(list.pinned()).isFalse();
        assertThat(list.wishlistCount()).isZero();
        assertThat(list.status()).isEqualTo(ListStatus.NOT_STARTED);
    }

    @Test
    void shouldKeepTheColorUntilAnotherOneIsChosen() {
        BookListResponse rust = lists.create(new BookListRequest("Clássicos", null, ListColor.RUST));

        BookListResponse described = lists.update(rust.id(), new BookListRequest("Clássicos", "Os de sempre", null));
        BookListResponse repainted = lists.update(rust.id(), new BookListRequest("Clássicos", null, ListColor.SEAL));

        assertThat(rust.color()).isEqualTo(ListColor.RUST);
        assertThat(described.color()).isEqualTo(ListColor.RUST);
        assertThat(repainted.color()).isEqualTo(ListColor.SEAL);
    }

    @Test
    void shouldRefuseTwoListsWithTheSameNameIgnoringCaseAndAccents() {
        lists.create(new BookListRequest("Para as férias", null, null));

        assertCode(
                () -> lists.create(new BookListRequest("PARA AS FERIAS", null, null)),
                ConflictException.class,
                "list.name-duplicated");
    }

    @Test
    void shouldRenameAListAndRefuseTheNameOfAnotherOne() {
        long vacation =
                lists.create(new BookListRequest("Para as férias", null, null)).id();
        long classics = lists.create(new BookListRequest("Clássicos", null, null)).id();

        BookListResponse renamed =
                lists.update(vacation, new BookListRequest("Para as Férias", "Agora com descrição", null));

        assertThat(renamed.name()).isEqualTo("Para as Férias");
        assertThat(renamed.description()).isEqualTo("Agora com descrição");
        assertCode(
                () -> lists.update(classics, new BookListRequest("para as ferias", null, null)),
                ConflictException.class,
                "list.name-duplicated");
    }

    @Test
    void shouldAddBooksAtTheEndOfTheList() {
        long list = listWith(fellowship, hobbit, dune);

        assertThat(order(list)).containsExactly(fellowship, hobbit, dune);
        assertThat(lists.get(list).bookCount()).isEqualTo(3);
    }

    @Test
    void shouldChangeNothingWhenTheBookIsAlreadyInTheList() {
        long list = listWith(fellowship, hobbit);

        lists.addBook(list, fellowship);
        entityManager.flush();

        assertThat(order(list)).containsExactly(fellowship, hobbit);
    }

    @Test
    void shouldRefuseAnUnknownBookOrList() {
        long list = listWith();

        assertCode(() -> lists.addBook(list, 9_999), NotFoundException.class, "book.not-found");
        assertCode(() -> lists.addBook(9_999, fellowship), NotFoundException.class, "list.not-found");
        assertCode(() -> lists.get(9_999), NotFoundException.class, "list.not-found");
    }

    @Test
    void shouldRemoveABookAndIgnoreOneThatIsNotInTheList() {
        long list = listWith(fellowship, hobbit);

        lists.removeBook(list, fellowship);
        lists.removeBook(list, dune);
        entityManager.flush();

        assertThat(order(list)).containsExactly(hobbit);
    }

    @Test
    void shouldAddAfterTheLastBookEvenWhenOneWasRemovedFromTheMiddle() {
        long list = listWith(fellowship, hobbit, dune);
        lists.removeBook(list, hobbit);
        entityManager.flush();

        lists.addBook(list, hobbit);
        entityManager.flush();

        assertThat(order(list)).containsExactly(fellowship, dune, hobbit);
    }

    @Test
    void shouldReorderTheList() {
        long list = listWith(fellowship, hobbit, dune);

        lists.reorder(list, List.of(dune, fellowship, hobbit));
        entityManager.flush();

        assertThat(order(list)).containsExactly(dune, fellowship, hobbit);
    }

    @Test
    void shouldRefuseAnOrderThatIsNotExactlyTheBooksOfTheList() {
        long list = listWith(fellowship, hobbit);

        assertCode(() -> lists.reorder(list, List.of(fellowship)), BusinessRuleException.class, "list.invalid-order");
        assertCode(
                () -> lists.reorder(list, List.of(fellowship, dune)),
                BusinessRuleException.class,
                "list.invalid-order");
        assertCode(
                () -> lists.reorder(list, List.of(fellowship, fellowship)),
                BusinessRuleException.class,
                "list.invalid-order");
    }

    @Test
    void shouldCountAsReadTheBooksWithAFinishedReading() {
        long list = listWith(fellowship, hobbit, dune);
        readings.create(
                fellowship, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse("2025-03-10"), null));
        readings.create(
                fellowship, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse("2025-08-10"), true));
        readings.create(hobbit, new ReadingRequest(ReadingStatus.ABANDONED, null, LocalDate.parse("2025-03-10"), null));
        readings.create(dune, new ReadingRequest(ReadingStatus.IN_PROGRESS, LocalDate.parse("2025-03-10"), null, null));
        entityManager.flush();

        BookListResponse response = lists.get(list);

        assertThat(response.bookCount()).isEqualTo(3);
        assertThat(response.readCount()).isEqualTo(1);
    }

    @Test
    void shouldShowTheCoversOfTheFirstBooksInTheOrderOfTheList() {
        long list = listWith(fellowship, hobbit, dune);
        String coverOfDune = books.replaceCover(dune, ImageSamples.PNG).coverUrl();
        String coverOfHobbit = books.replaceCover(hobbit, ImageSamples.JPEG).coverUrl();
        entityManager.flush();

        assertThat(lists.get(list).coverUrls()).containsExactly(coverOfHobbit, coverOfDune);
    }

    @Test
    void shouldListTheCardsByNameWithTheirCounts() {
        long vacation = listWith(fellowship, hobbit);
        lists.create(new BookListRequest("Clássicos", null, null));
        readings.create(hobbit, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse("2025-03-10"), null));
        entityManager.flush();

        List<BookListResponse> cards = lists.search(ListFilter.none(), BY_NAME).getContent();

        assertThat(cards).extracting(BookListResponse::name).containsExactly("Clássicos", "Para as férias");
        assertThat(cards.get(0).bookCount()).isZero();
        assertThat(cards.get(1).id()).isEqualTo(vacation);
        assertThat(cards.get(1).bookCount()).isEqualTo(2);
        assertThat(cards.get(1).readCount()).isEqualTo(1);
    }

    @Test
    void shouldAnswerAnEmptyPageWhenThereAreNoLists() {
        assertThat(lists.search(ListFilter.none(), BY_NAME).getTotalElements()).isZero();
    }

    @Test
    void shouldCountTheBooksOnTheWishlistInTheTotal() {
        long wanted = book("Mistborn", tolkien, Ownership.WISHLIST);
        long list = listWith(fellowship, wanted);

        BookListResponse response = lists.get(list);

        assertThat(response.bookCount()).isEqualTo(2);
        assertThat(response.wishlistCount()).isEqualTo(1);
    }

    @Test
    void shouldTellHowFarTheReadingOfEachListIs() {
        long notStarted = listNamed("Para depois", dune);
        long inProgress = listNamed("Aventuras", fellowship, hobbit);
        long completed = listNamed("Clássicos");
        lists.addBook(completed, hobbit);
        finish(hobbit);
        entityManager.flush();

        assertThat(lists.get(notStarted).status()).isEqualTo(ListStatus.NOT_STARTED);
        assertThat(lists.get(inProgress).status()).isEqualTo(ListStatus.IN_PROGRESS);
        assertThat(lists.get(completed).status()).isEqualTo(ListStatus.COMPLETED);
    }

    @Test
    void shouldFilterTheCardsByNameStatusAndPinned() {
        listNamed("Aventuras", fellowship, hobbit);
        long classics = listNamed("Clássicos", dune);
        listNamed("Para depois", fellowship);
        finish(hobbit);
        finish(dune);
        entityManager.flush();
        lists.pin(classics);

        assertThat(names(new ListFilter(null, ListStatus.IN_PROGRESS, null))).containsExactly("Aventuras");
        assertThat(names(new ListFilter(null, ListStatus.COMPLETED, null))).containsExactly("Clássicos");
        assertThat(names(new ListFilter(null, ListStatus.NOT_STARTED, null))).containsExactly("Para depois");
        assertThat(names(new ListFilter("AVENTURA", null, null))).containsExactly("Aventuras");
        assertThat(names(new ListFilter("classicos", null, null))).containsExactly("Clássicos");
        assertThat(names(new ListFilter("  ", null, null))).hasSize(3);
        assertThat(names(new ListFilter(null, null, true))).containsExactly("Clássicos");
        assertThat(names(new ListFilter(null, null, false))).containsExactly("Aventuras", "Para depois");
        assertThat(names(new ListFilter(null, ListStatus.COMPLETED, false))).isEmpty();
    }

    @Test
    void shouldPageTheCardsAfterFiltering() {
        listNamed("A", fellowship);
        listNamed("B", hobbit);
        listNamed("C", dune);

        Page<BookListResponse> second = lists.search(ListFilter.none(), byName(1, 2));
        Page<BookListResponse> beyond = lists.search(ListFilter.none(), byName(5, 2));

        assertThat(second.getContent()).extracting(BookListResponse::name).containsExactly("C");
        assertThat(second.getTotalElements()).isEqualTo(3);
        assertThat(beyond.getContent()).isEmpty();
        assertThat(beyond.getTotalElements()).isEqualTo(3);
    }

    @Test
    void shouldPinOneListAtATime() {
        long first = lists.create(new BookListRequest("Primeira", null, null)).id();
        long second = lists.create(new BookListRequest("Segunda", null, null)).id();

        lists.pin(first);
        lists.pin(second);
        lists.pin(second);

        assertThat(lists.get(first).pinned()).isFalse();
        assertThat(lists.get(second).pinned()).isTrue();

        lists.unpin(second);
        lists.unpin(second);

        assertThat(lists.get(second).pinned()).isFalse();
        assertThat(names(new ListFilter(null, null, true))).isEmpty();
    }

    @Test
    void shouldRefusePinningOrUnpinningAnUnknownList() {
        assertCode(() -> lists.pin(9_999), NotFoundException.class, "list.not-found");
        assertCode(() -> lists.unpin(9_999), NotFoundException.class, "list.not-found");
    }

    @Test
    void shouldMoveUpdatedAtWhenABookIsAddedRemovedOrMoved() {
        long list = listWith(fellowship, hobbit);
        Instant longAgo = LONG_AGO.toInstant();

        longAgo(list);
        lists.addBook(list, dune);
        assertThat(updatedAt(list)).isAfter(longAgo);

        longAgo(list);
        lists.removeBook(list, dune);
        assertThat(updatedAt(list)).isAfter(longAgo);

        longAgo(list);
        lists.reorder(list, List.of(hobbit, fellowship));
        assertThat(updatedAt(list)).isAfter(longAgo);
    }

    @Test
    void shouldMoveUpdatedAtWhenTheListIsEdited() {
        long list = listWith(fellowship);

        longAgo(list);
        lists.update(list, new BookListRequest("Para as férias", "Agora com descrição", null));

        assertThat(updatedAt(list)).isAfter(LONG_AGO.toInstant());
    }

    @Test
    void shouldKeepUpdatedAtWhenNothingChangedInTheList() {
        long list = listWith(fellowship);

        longAgo(list);
        lists.addBook(list, fellowship);
        lists.removeBook(list, dune);

        assertThat(updatedAt(list)).isEqualTo(LONG_AGO.toInstant());
    }

    @Test
    void shouldKeepUpdatedAtWhenPinningAndUnpinning() {
        long list = listWith(fellowship);

        longAgo(list);
        lists.pin(list);
        lists.unpin(list);

        assertThat(updatedAt(list)).isEqualTo(LONG_AGO.toInstant());
    }

    @Test
    void shouldSortTheCardsByTheLastChange() {
        long old = listNamed("Antiga", fellowship);
        long recent = listNamed("Recente", hobbit);

        longAgo(old);
        lists.addBook(recent, dune);
        entityManager.clear();

        Page<BookListResponse> cards =
                lists.search(ListFilter.none(), PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "updatedAt")));

        assertThat(cards.getContent()).extracting(BookListResponse::name).containsExactly("Recente", "Antiga");
    }

    @Test
    void shouldDeleteTheListAndKeepItsBooks() {
        long list = listWith(fellowship, hobbit);

        lists.delete(list);
        entityManager.flush();

        assertThat(itemCount()).isZero();
        assertThat(books.get(fellowship).title()).isEqualTo("A Sociedade do Anel");
    }

    @Test
    void shouldTakeADeletedBookOutOfItsLists() {
        long list = listWith(fellowship, hobbit);

        books.delete(fellowship);
        entityManager.flush();
        entityManager.clear();

        assertThat(order(list)).containsExactly(hobbit);
        assertThat(lists.get(list).bookCount()).isEqualTo(1);
    }

    private long listWith(long... bookIds) {
        return listNamed("Para as férias", bookIds);
    }

    private long listNamed(String name, long... bookIds) {
        long list = lists.create(new BookListRequest(name, null, null)).id();
        for (long bookId : bookIds) {
            lists.addBook(list, bookId);
        }
        entityManager.flush();
        return list;
    }

    private void finish(long book) {
        readings.create(book, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse("2025-03-10"), null));
    }

    private static PageRequest byName(int page, int size) {
        return PageRequest.of(page, size, Sort.by("normalizedName"));
    }

    private List<String> names(ListFilter filter) {
        entityManager.flush();
        entityManager.clear();
        return lists.search(filter, BY_NAME).getContent().stream()
                .map(BookListResponse::name)
                .toList();
    }

    /** Puts the last change of the list far in the past, to see whether an operation moves it. */
    private void longAgo(long list) {
        entityManager.flush();
        jdbc.sql("update book_list set updated_at = ? where id = ?")
                .param(LONG_AGO)
                .param(list)
                .update();
    }

    private Instant updatedAt(long list) {
        entityManager.flush();
        return jdbc.sql("select updated_at from book_list where id = ?")
                .param(list)
                .query(OffsetDateTime.class)
                .single()
                .toInstant();
    }

    private List<Long> order(long list) {
        return jdbc.sql("select book_id from book_list_item where book_list_id = ? order by item_order")
                .param(list)
                .query(Long.class)
                .list();
    }

    private long itemCount() {
        return jdbc.sql("select count(*) from book_list_item").query(Long.class).single();
    }

    private long book(String title, long author) {
        return book(title, author, Ownership.OWNED);
    }

    private long book(String title, long author, Ownership ownership) {
        return books.create(new BookRequest(
                        title,
                        null,
                        null,
                        null,
                        300,
                        null,
                        null,
                        null,
                        List.of(author),
                        null,
                        null,
                        null,
                        null,
                        ownership,
                        false))
                .id();
    }

    private static void assertCode(ThrowingCallable action, Class<? extends Throwable> type, String code) {
        assertThatThrownBy(action).isInstanceOf(type).extracting("code").isEqualTo(code);
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-lists-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
