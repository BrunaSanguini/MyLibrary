package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
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

@SpringBootTest
@Transactional
class FeaturedBookServiceTest {

    private static final Path DATA_DIR = tempDataDir();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private FeaturedBookService featured;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private EntityManager entityManager;

    private long fellowship;
    private long hobbit;
    private long dune;
    private long wished;

    @BeforeEach
    void books() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        fellowship = book("A Sociedade do Anel", tolkien, Ownership.OWNED);
        hobbit = book("O Hobbit", tolkien, Ownership.OWNED);
        dune = book("Duna", tolkien, Ownership.OWNED);
        wished = book("O Silmarillion", tolkien, Ownership.WISHLIST);
    }

    @Test
    void shouldStartWithoutFeaturedBooks() {
        assertThat(featured.list()).isEmpty();
    }

    @Test
    void shouldFeatureTheBooksInTheOrderGiven() {
        List<FeaturedBookResponse> saved = featured.replace(request(slot(hobbit, null), slot(fellowship, null)));

        assertThat(saved).extracting(FeaturedBookResponse::slot).containsExactly(1, 2);
        assertThat(saved).extracting(FeaturedBookResponse::bookId).containsExactly(hobbit, fellowship);
        assertThat(saved.getFirst().title()).isEqualTo("O Hobbit");
        assertThat(saved.getFirst().authors()).containsExactly("J. R. R. Tolkien");
        assertThat(saved.getFirst().imageUrl()).isNull();
    }

    @Test
    void shouldKeepTheImageOfTheSlotWhenTheBookChanges() {
        featured.replace(request(slot(hobbit, null), slot(fellowship, null)));
        entityManager.flush();
        @Nullable String image = featured.replaceImage(2, ImageSamples.PNG).imageUrl();
        entityManager.flush();

        List<FeaturedBookResponse> saved = featured.replace(request(slot(dune, 2)));
        entityManager.flush();

        assertThat(saved).singleElement().satisfies(item -> {
            assertThat(item.slot()).isEqualTo(1);
            assertThat(item.bookId()).isEqualTo(dune);
            assertThat(item.imageUrl()).isEqualTo(image);
        });
    }

    @Test
    void shouldRefuseMoreThanOneSlotForTheSameBook() {
        FeaturedBooksRequest twice = request(slot(hobbit, null), slot(hobbit, null));

        assertCode(() -> featured.replace(twice), BusinessRuleException.class, "featured.duplicated-book");
    }

    @Test
    void shouldRefuseABookThatIsNotInTheCollection() {
        FeaturedBooksRequest wishlist = request(slot(wished, null));
        FeaturedBooksRequest unknown = request(slot(9_999L, null));

        assertCode(() -> featured.replace(wishlist), BusinessRuleException.class, "featured.book-not-owned");
        assertCode(() -> featured.replace(unknown), NotFoundException.class, "book.not-found");
    }

    @Test
    void shouldRefuseAnImageForAnEmptySlot() {
        assertCode(() -> featured.replaceImage(3, ImageSamples.PNG), NotFoundException.class, "featured.not-found");
    }

    @Test
    void shouldLeaveTheFeaturedBooksWhenTheBookIsDeleted() {
        featured.replace(request(slot(hobbit, null), slot(fellowship, null)));
        entityManager.flush();
        featured.replaceImage(1, ImageSamples.PNG);
        entityManager.flush();

        books.delete(hobbit);
        entityManager.flush();
        entityManager.clear();

        assertThat(featured.list()).extracting(FeaturedBookResponse::bookId).containsExactly(fellowship);
    }

    private static FeaturedBooksRequest request(FeaturedSlotRequest... slots) {
        return new FeaturedBooksRequest(List.of(slots));
    }

    private static FeaturedSlotRequest slot(long bookId, @Nullable Integer imageFrom) {
        return new FeaturedSlotRequest(bookId, imageFrom);
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
            return Files.createTempDirectory("minha-livraria-featured-");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
