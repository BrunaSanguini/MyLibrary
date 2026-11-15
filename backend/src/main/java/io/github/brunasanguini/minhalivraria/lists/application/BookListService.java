package io.github.brunasanguini.minhalivraria.lists.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.lists.domain.BookList;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListItem;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListItemId;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListItemRepository;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListRepository;
import io.github.brunasanguini.minhalivraria.reading.ReadingHistory;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lists of books: the lists themselves and which books each one has, in which order. */
@Service
@Transactional(readOnly = true)
public class BookListService {

    private static final int COVERS_ON_A_CARD = 3;

    private final BookListRepository lists;
    private final BookListItemRepository items;
    private final BookCatalog books;
    private final ReadingHistory readings;
    private final Clock clock;

    BookListService(
            BookListRepository lists,
            BookListItemRepository items,
            BookCatalog books,
            ReadingHistory readings,
            Clock clock) {
        this.lists = lists;
        this.items = items;
        this.books = books;
        this.readings = readings;
        this.clock = clock;
    }

    /** A page of cards costs four queries, whatever its size: lists, items, books and readings. */
    public Page<BookListResponse> search(Pageable pageable) {
        Page<BookList> page = lists.findAll(pageable);
        List<Long> ids = page.stream().map(BookList::id).toList();
        Map<Long, List<BookListItem>> itemsByList = ids.isEmpty()
                ? Map.of()
                : items.findByIdBookListIdInOrderByIdBookListIdAscItemOrderAsc(ids).stream()
                        .collect(Collectors.groupingBy(BookListItem::bookListId));
        List<Long> bookIds = itemsByList.values().stream()
                .flatMap(List::stream)
                .map(BookListItem::bookId)
                .distinct()
                .toList();
        Map<Long, BookSummary> summaries = books.findAll(bookIds);
        Set<Long> read = readings.booksRead(bookIds);
        return page.map(list -> toResponse(list, itemsByList.getOrDefault(list.id(), List.of()), summaries, read));
    }

    public BookListResponse get(long id) {
        return toResponse(find(id));
    }

    /**
     * @throws ConflictException {@code list.name-duplicated}
     */
    @Transactional
    public BookListResponse create(BookListRequest request) {
        if (lists.existsByNormalizedName(TextNormalizer.normalize(request.name()))) {
            throw new ConflictException("list.name-duplicated");
        }
        return toResponse(lists.saveAndFlush(new BookList(request.name(), request.description())));
    }

    /**
     * @throws ConflictException {@code list.name-duplicated}
     */
    @Transactional
    public BookListResponse update(long id, BookListRequest request) {
        BookList list = find(id);
        if (lists.existsByNormalizedNameAndIdNot(TextNormalizer.normalize(request.name()), id)) {
            throw new ConflictException("list.name-duplicated");
        }
        list.update(request.name(), request.description());
        // The flush stamps updated_at before the answer is built.
        return toResponse(lists.saveAndFlush(list));
    }

    /** The items go with the list (FK); the books stay in the collection. */
    @Transactional
    public void delete(long id) {
        lists.delete(find(id));
    }

    /** Adds the book at the end. Adding a book that is already in the list changes nothing. */
    @Transactional
    public void addBook(long id, long bookId) {
        find(id);
        books.require(bookId);
        if (items.existsById(new BookListItemId(id, bookId))) {
            return;
        }
        int next = items.findByIdBookListIdOrderByItemOrderAsc(id).stream()
                        .mapToInt(BookListItem::itemOrder)
                        .max()
                        .orElse(-1)
                + 1;
        items.save(new BookListItem(id, bookId, next, Instant.now(clock)));
    }

    /** Removing a book that is not in the list changes nothing. */
    @Transactional
    public void removeBook(long id, long bookId) {
        find(id);
        items.findById(new BookListItemId(id, bookId)).ifPresent(items::delete);
    }

    /**
     * @param bookIds the books of the list in their new order
     * @throws BusinessRuleException {@code list.invalid-order}, unless they are exactly the books of the list, each
     *     one once
     */
    @Transactional
    public void reorder(long id, List<Long> bookIds) {
        find(id);
        List<BookListItem> current = items.findByIdBookListIdOrderByItemOrderAsc(id);
        Set<Long> inList = current.stream().map(BookListItem::bookId).collect(Collectors.toSet());
        if (bookIds.size() != inList.size() || !new HashSet<>(bookIds).equals(inList)) {
            throw new BusinessRuleException("list.invalid-order");
        }
        Map<Long, BookListItem> byBook = current.stream().collect(Collectors.toMap(BookListItem::bookId, item -> item));
        for (int position = 0; position < bookIds.size(); position++) {
            Objects.requireNonNull(byBook.get(bookIds.get(position))).moveTo(position);
        }
    }

    private BookList find(long id) {
        return lists.findById(id).orElseThrow(() -> new NotFoundException("list.not-found"));
    }

    private BookListResponse toResponse(BookList list) {
        List<BookListItem> ofList = items.findByIdBookListIdOrderByItemOrderAsc(list.id());
        List<Long> bookIds = ofList.stream().map(BookListItem::bookId).toList();
        return toResponse(list, ofList, books.findAll(bookIds), readings.booksRead(bookIds));
    }

    private static BookListResponse toResponse(
            BookList list, List<BookListItem> ofList, Map<Long, BookSummary> summaries, Set<Long> read) {
        List<String> covers = ofList.stream()
                .map(item -> summaries.get(item.bookId()))
                .filter(Objects::nonNull)
                .map(BookSummary::coverUrl)
                .filter(Objects::nonNull)
                .limit(COVERS_ON_A_CARD)
                .toList();
        int readCount = (int)
                ofList.stream().filter(item -> read.contains(item.bookId())).count();
        return new BookListResponse(
                list.id(),
                list.name(),
                list.description(),
                ofList.size(),
                readCount,
                covers,
                Objects.requireNonNull(list.updatedAt(), "List not saved yet"));
    }
}
