package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.domain.Author;
import io.github.brunasanguini.minhalivraria.books.domain.Book;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.books.domain.FeaturedBook;
import io.github.brunasanguini.minhalivraria.books.domain.FeaturedBookRepository;
import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageStore;
import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The books featured on the Home (Configurações → Destaques da Home): one to three books of the collection, each
 * with an image the user sends for its slot.
 */
@Service
@Transactional(readOnly = true)
public class FeaturedBookService {

    private final FeaturedBookRepository featured;
    private final BookRepository books;
    private final ImageStore images;

    FeaturedBookService(FeaturedBookRepository featured, BookRepository books, ImageStore images) {
        this.featured = featured;
        this.books = books;
        this.images = images;
    }

    /** In the order of the Home; empty until the user chooses them. */
    public List<FeaturedBookResponse> list() {
        return featured.findAllByOrderBySlotAsc().stream().map(this::toResponse).toList();
    }

    /**
     * Replaces every slot. Each one can keep the image of a slot it had before; the images no slot keeps go to the
     * trash after the commit.
     *
     * @throws NotFoundException {@code book.not-found}
     * @throws BusinessRuleException {@code featured.duplicated-book}, when a book is in two slots, or {@code
     *     featured.book-not-owned}, when a book is not in the collection
     */
    @Transactional
    public List<FeaturedBookResponse> replace(FeaturedBooksRequest request) {
        List<FeaturedSlotRequest> slots = request.slots();
        Set<Long> bookIds = slots.stream().map(FeaturedSlotRequest::bookId).collect(Collectors.toSet());
        if (bookIds.size() != slots.size()) {
            throw new BusinessRuleException("featured.duplicated-book");
        }
        for (Long bookId : bookIds) {
            if (findBook(bookId).ownership() != Ownership.OWNED) {
                throw new BusinessRuleException("featured.book-not-owned");
            }
        }

        Map<Integer, FeaturedBook> before =
                featured.findAll().stream().collect(Collectors.toMap(FeaturedBook::slot, Function.identity()));
        Set<Long> kept = new HashSet<>();
        List<FeaturedBook> after = new ArrayList<>();
        for (int index = 0; index < slots.size(); index++) {
            FeaturedSlotRequest slot = slots.get(index);
            Long imageId = imageOf(before, slot.imageFrom());
            if (imageId != null) {
                kept.add(imageId);
            }
            after.add(new FeaturedBook(index + 1, slot.bookId(), imageId));
        }
        for (FeaturedBook previous : before.values()) {
            Long imageId = previous.imageId();
            if (imageId != null && !kept.contains(imageId)) {
                images.discard(imageId);
            }
        }

        // Deleted at once, so the new slots do not meet the old ones in the unique key.
        featured.deleteAllInBatch();
        featured.saveAll(after);
        return list();
    }

    /**
     * Sends the image of a slot; the previous one goes to the trash after the commit.
     *
     * @throws NotFoundException {@code featured.not-found}, when the slot has no book
     */
    @Transactional
    public FeaturedBookResponse replaceImage(int slot, byte[] content) {
        FeaturedBook item =
                featured.findBySlot((short) slot).orElseThrow(() -> new NotFoundException("featured.not-found"));
        long imageId = images.store(ImageKind.BANNER, content);
        Long previous = item.replaceImage(imageId);
        if (previous != null) {
            images.discard(previous);
        }
        return toResponse(item);
    }

    /** A deleted book leaves its slot (FK); the image of the slot goes to the trash with it. */
    @Transactional
    public void forgetBook(long bookId) {
        for (FeaturedBook item : featured.findByBookId(bookId)) {
            Long imageId = item.replaceImage(null);
            if (imageId != null) {
                images.discard(imageId);
            }
        }
    }

    private static @Nullable Long imageOf(Map<Integer, FeaturedBook> before, @Nullable Integer slot) {
        FeaturedBook previous = slot == null ? null : before.get(slot);
        return previous == null ? null : previous.imageId();
    }

    private Book findBook(long id) {
        return books.findById(id).orElseThrow(() -> new NotFoundException("book.not-found"));
    }

    private FeaturedBookResponse toResponse(FeaturedBook item) {
        Book book = findBook(item.bookId());
        Long coverId = book.coverImageId();
        Long imageId = item.imageId();
        return new FeaturedBookResponse(
                item.slot(),
                book.id(),
                book.title(),
                book.authors().stream().map(Author::name).toList(),
                coverId == null ? null : ImageUrls.of(coverId),
                imageId == null ? null : ImageUrls.of(imageId));
    }
}
