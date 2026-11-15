package io.github.brunasanguini.minhalivraria.lists.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
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
import java.time.LocalDate;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

    private long fellowship;
    private long hobbit;
    private long dune;

    @BeforeEach
    void books() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        fellowship = book("A Sociedade do Anel", tolkien);
        hobbit = book("O Hobbit", tolkien);
        dune = book("Duna", tolkien);
    }

    @Test
    void shouldCreateAnEmptyList() {
        BookListResponse list = lists.create(new BookListRequest("Para as férias", "Leituras leves"));

        assertThat(list.name()).isEqualTo("Para as férias");
        assertThat(list.description()).isEqualTo("Leituras leves");
        assertThat(list.bookCount()).isZero();
        assertThat(list.readCount()).isZero();
        assertThat(list.coverUrls()).isEmpty();
        assertThat(list.updatedAt()).isNotNull();
    }

    @Test
    void shouldRefuseTwoListsWithTheSameNameIgnoringCaseAndAccents() {
        lists.create(new BookListRequest("Para as férias", null));

        assertCode(
                () -> lists.create(new BookListRequest("PARA AS FERIAS", null)),
                ConflictException.class,
                "list.name-duplicated");
    }

    @Test
    void shouldRenameAListAndRefuseTheNameOfAnotherOne() {
        long vacation = lists.create(new BookListRequest("Para as férias", null)).id();
        long classics = lists.create(new BookListRequest("Clássicos", null)).id();

        BookListResponse renamed = lists.update(vacation, new BookListRequest("Para as Férias", "Agora com descrição"));

        assertThat(renamed.name()).isEqualTo("Para as Férias");
        assertThat(renamed.description()).isEqualTo("Agora com descrição");
        assertCode(
                () -> lists.update(classics, new BookListRequest("para as ferias", null)),
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
        lists.create(new BookListRequest("Clássicos", null));
        readings.create(hobbit, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse("2025-03-10"), null));
        entityManager.flush();

        List<BookListResponse> cards = lists.search(BY_NAME).getContent();

        assertThat(cards).extracting(BookListResponse::name).containsExactly("Clássicos", "Para as férias");
        assertThat(cards.get(0).bookCount()).isZero();
        assertThat(cards.get(1).id()).isEqualTo(vacation);
        assertThat(cards.get(1).bookCount()).isEqualTo(2);
        assertThat(cards.get(1).readCount()).isEqualTo(1);
    }

    @Test
    void shouldAnswerAnEmptyPageWhenThereAreNoLists() {
        assertThat(lists.search(BY_NAME).getTotalElements()).isZero();
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
        long list = lists.create(new BookListRequest("Para as férias", null)).id();
        for (long bookId : bookIds) {
            lists.addBook(list, bookId);
        }
        entityManager.flush();
        return list;
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
                        Ownership.OWNED,
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
