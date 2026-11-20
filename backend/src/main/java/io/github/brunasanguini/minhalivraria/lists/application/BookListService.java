package io.github.brunasanguini.minhalivraria.lists.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.lists.domain.BookList;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListItem;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListItemId;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListItemRepository;
import io.github.brunasanguini.minhalivraria.lists.domain.BookListRepository;
import io.github.brunasanguini.minhalivraria.lists.domain.ListColor;
import io.github.brunasanguini.minhalivraria.reading.ReadingHistory;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
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

    /**
     * A page of cards costs four queries, whatever its size: lists, items, readings and books. The status of a list
     * depends on the readings, which belong to another module, so the filters and the page are applied here, over the
     * lists that have the term in the name. A person has few lists, and the books are only fetched for the page.
     */
    public Page<BookListResponse> search(ListFilter filter, Pageable pageable) {
        String q = filter.q();
        String term = q == null ? "" : TextNormalizer.normalize(q);
        List<BookList> named = term.isEmpty()
                ? lists.findAll(pageable.getSort())
                : lists.findByNormalizedNameContaining(term, pageable.getSort());
        Boolean pinned = filter.pinned();
        List<BookList> candidates = new ArrayList<>();
        for (BookList list : named) {
            if (pinned == null || list.pinned() == pinned) {
                candidates.add(list);
            }
        }
        Map<Long, List<BookListItem>> itemsByList = itemsOf(candidates);
        Set<Long> read = readings.booksRead(bookIdsOf(itemsByList));
        ListStatus status = filter.status();
        List<BookList> matching = new ArrayList<>();
        for (BookList list : candidates) {
            if (status == null || statusOf(itemsByList.getOrDefault(list.id(), List.of()), read) == status) {
                matching.add(list);
            }
        }
        int from = (int) Math.min(pageable.getOffset(), matching.size());
        int to = Math.min(from + pageable.getPageSize(), matching.size());
        List<BookList> ofPage = matching.subList(from, to);
        Set<Long> pageBookIds = new LinkedHashSet<>();
        for (BookList list : ofPage) {
            for (BookListItem item : itemsByList.getOrDefault(list.id(), List.of())) {
                pageBookIds.add(item.bookId());
            }
        }
        Map<Long, BookSummary> summaries = books.findAll(pageBookIds);
        List<BookListResponse> content = ofPage.stream()
                .map(list -> toResponse(list, itemsByList.getOrDefault(list.id(), List.of()), summaries, read))
                .toList();
        return new PageImpl<>(content, pageable, matching.size());
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
        ListColor color = request.color();
        return toResponse(lists.saveAndFlush(
                new BookList(request.name(), request.description(), color == null ? ListColor.DEFAULT : color)));
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
        ListColor color = request.color();
        list.update(request.name(), request.description(), color == null ? list.color() : color);
        // The flush stamps updated_at before the answer is built.
        return toResponse(lists.saveAndFlush(list));
    }

    /** The items go with the list (FK); the books stay in the collection. */
    @Transactional
    public void delete(long id) {
        lists.delete(find(id));
    }

    /** Pins the list on the Lists page and unpins the one that was pinned before. Pinning it again changes nothing. */
    @Transactional
    public void pin(long id) {
        find(id);
        lists.unpinAll();
        lists.setPinned(id, true);
    }

    /** Unpinning a list that is not pinned changes nothing. */
    @Transactional
    public void unpin(long id) {
        find(id);
        lists.setPinned(id, false);
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
        Instant now = Instant.now(clock);
        items.save(new BookListItem(id, bookId, next, now));
        lists.touch(id, now);
    }

    /** Removing a book that is not in the list changes nothing. */
    @Transactional
    public void removeBook(long id, long bookId) {
        find(id);
        items.findById(new BookListItemId(id, bookId)).ifPresent(item -> {
            items.delete(item);
            lists.touch(id, Instant.now(clock));
        });
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
        lists.touch(id, Instant.now(clock));
    }

    private BookList find(long id) {
        return lists.findById(id).orElseThrow(() -> new NotFoundException("list.not-found"));
    }

    private BookListResponse toResponse(BookList list) {
        List<BookListItem> ofList = items.findByIdBookListIdOrderByItemOrderAsc(list.id());
        List<Long> bookIds = ofList.stream().map(BookListItem::bookId).toList();
        return toResponse(list, ofList, books.findAll(bookIds), readings.booksRead(bookIds));
    }

    /** The items of each list, in the order of the list. A list without books is not in the map. */
    private Map<Long, List<BookListItem>> itemsOf(List<BookList> ofLists) {
        if (ofLists.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = ofLists.stream().map(BookList::id).toList();
        return items.findByIdBookListIdInOrderByIdBookListIdAscItemOrderAsc(ids).stream()
                .collect(Collectors.groupingBy(BookListItem::bookListId));
    }

    private static List<Long> bookIdsOf(Map<Long, List<BookListItem>> itemsByList) {
        return itemsByList.values().stream()
                .flatMap(List::stream)
                .map(BookListItem::bookId)
                .distinct()
                .toList();
    }

    private static int readCountOf(List<BookListItem> ofList, Set<Long> read) {
        return (int)
                ofList.stream().filter(item -> read.contains(item.bookId())).count();
    }

    private static ListStatus statusOf(List<BookListItem> ofList, Set<Long> read) {
        return ListStatus.of(ofList.size(), readCountOf(ofList, read));
    }

    private static BookListResponse toResponse(
            BookList list, List<BookListItem> ofList, Map<Long, BookSummary> summaries, Set<Long> read) {
        List<BookSummary> ofBooks = ofList.stream()
                .map(item -> summaries.get(item.bookId()))
                .filter(Objects::nonNull)
                .toList();
        List<String> covers = ofBooks.stream()
                .map(BookSummary::coverUrl)
                .filter(Objects::nonNull)
                .limit(COVERS_ON_A_CARD)
                .toList();
        int wishlistCount = (int) ofBooks.stream()
                .filter(book -> book.ownership() == Ownership.WISHLIST)
                .count();
        return new BookListResponse(
                list.id(),
                list.name(),
                list.description(),
                list.color(),
                list.pinned(),
                ofList.size(),
                readCountOf(ofList, read),
                wishlistCount,
                statusOf(ofList, read),
                covers,
                Objects.requireNonNull(list.updatedAt(), "List not saved yet"));
    }
}
