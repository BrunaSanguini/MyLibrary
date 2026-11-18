package io.github.brunasanguini.minhalivraria.shelf.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse.CardProgressResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse.CardSeriesResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds the book cards with SQL, reading the tables of the other modules straight (ADR-0005).
 *
 * <p>A page costs three queries: the cards, then the authors and the genres of the ids on the page. Joining the two
 * collections in the main query would multiply the rows and break both the page size and the count.
 */
@Service
@Transactional(readOnly = true)
public class ShelfService {

    private static final String FROM_BOOK = """
            from book b
            left join series s on s.id = b.series_id
            left join book_author ba0 on ba0.book_id = b.id and ba0.author_order = 0
            left join author a0 on a0.id = ba0.author_id
            left join review rv on rv.book_id = b.id
            """;

    /**
     * The status of docs/modelo-de-dados.md. Reading wins; otherwise the latest reading decides, by end date and
     * then by id, which is the order they were registered in.
     */
    private static final String STATUS = """
            case when exists (
                select 1 from reading r where r.book_id = b.id and r.status = 'IN_PROGRESS') then 'READING'
            else coalesce((
                select case when r.status = 'FINISHED' then 'READ' else 'ABANDONED' end
                from reading r where r.book_id = b.id and r.status <> 'IN_PROGRESS'
                order by r.end_date desc, r.id desc fetch first 1 row only), 'WANT_TO_READ') end""";

    private static final String PAGES_IN_PROGRESS = """
            (select coalesce(sum(rs.pages_read), 0) from reading_session rs
                join reading r on r.id = rs.reading_id
                where r.book_id = b.id and r.status = 'IN_PROGRESS')""";

    /** How many subgenres a book shares with the book :id. */
    private static final String SHARED_SUBGENRES = """
            (select count(*) from book_genre bg join genre g on g.id = bg.genre_id
                where bg.book_id = b.id and g.parent_id is not null
                and bg.genre_id in (select own.genre_id from book_genre own where own.book_id = :id))""";

    private static final int SERIES_LIMIT = 100;
    private static final int SIMILAR_LIMIT = 12;
    private static final int COMPLETE = 100;

    private final JdbcClient jdbc;

    ShelfService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Unlike the catalog endpoints, the shelf resolves its own pagination: the sort fields become SQL columns, which
     * is a detail of this query and has no business in the controller.
     */
    public Page<BookCardResponse> search(ShelfFilter filter, PageQuery page) {
        Pageable pageable = page.toPageable(ShelfSort.COLUMNS, ShelfSort.DEFAULT);
        boolean byListOrder = pageable.getSort().stream()
                .anyMatch(order -> order.getProperty().equals(ShelfSort.LIST_ORDER));
        if (byListOrder && filter.listId() == null) {
            // The order of a list means nothing without the list.
            throw new BadRequestException("request.invalid-sort");
        }
        Conditions conditions = conditionsOf(filter);
        long total = count(conditions);
        if (total == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        List<Card> cards = cards(
                conditions.where(),
                conditions.params(),
                ShelfSort.orderBy(pageable.getSort()),
                pageable.getPageSize(),
                pageable.getOffset());
        if (cards.isEmpty()) {
            // A page past the end of the result: there is a total, but nothing to fill in.
            return new PageImpl<>(List.of(), pageable, total);
        }
        return new PageImpl<>(withCollections(cards), pageable, total);
    }

    /**
     * What the page of a book shows below it.
     *
     * @throws NotFoundException {@code book.not-found}
     */
    public RelatedBooksResponse related(long bookId) {
        Long found = jdbc.sql("select count(*) from book where id = :id")
                .param("id", bookId)
                .query(Long.class)
                .single();
        if (found == null || found == 0) {
            throw new NotFoundException("book.not-found");
        }
        Map<String, Object> params = Map.of("id", bookId);
        List<Card> series = cards(
                " where b.id <> :id and b.series_id = (select own.series_id from book own where own.id = :id)",
                params,
                "b.series_position asc, b.id asc",
                SERIES_LIMIT,
                0);
        // The books of the series are already in the other list.
        List<Card> similar = cards(
                " where b.id <> :id and " + SHARED_SUBGENRES + " > 0"
                        + " and (b.series_id is null or b.series_id not in ("
                        + "select own.series_id from book own where own.id = :id and own.series_id is not null))",
                params,
                SHARED_SUBGENRES + " desc, b.search_text asc, b.id asc",
                SIMILAR_LIMIT,
                0);
        return new RelatedBooksResponse(withCollections(series), withCollections(similar));
    }

    private long count(Conditions conditions) {
        Long total = jdbc.sql("select count(*) from book b" + conditions.where())
                .params(conditions.params())
                .query(Long.class)
                .single();
        return total == null ? 0 : total;
    }

    private List<Card> cards(String where, Map<String, Object> params, String orderBy, int limit, long offset) {
        String sql = "select b.id, b.title, b.cover_image_id, b.ownership, b.favorite, b.page_count, b.published_year,"
                + " s.id as series_id, s.name as series_name, b.series_position, rv.rating,"
                + STATUS + " as shelf_status, " + PAGES_IN_PROGRESS + " as pages_in_progress "
                + FROM_BOOK
                + where
                + " order by "
                + orderBy
                + " limit :limit offset :offset";
        return jdbc.sql(sql)
                .params(params)
                .param("limit", limit)
                .param("offset", offset)
                .query((rs, row) -> {
                    ShelfStatus status = ShelfStatus.valueOf(rs.getString("shelf_status"));
                    return new Card(
                            rs.getLong("id"),
                            rs.getString("title"),
                            imageUrl(rs.getObject("cover_image_id", Long.class)),
                            status,
                            progress(status, rs.getInt("pages_in_progress"), rs.getObject("page_count", Integer.class)),
                            rs.getBigDecimal("rating"),
                            Ownership.valueOf(rs.getString("ownership")),
                            rs.getBoolean("favorite"),
                            series(
                                    rs.getObject("series_id", Long.class),
                                    rs.getString("series_name"),
                                    rs.getBigDecimal("series_position")),
                            rs.getObject("published_year", Short.class));
                })
                .list();
    }

    /** Fills authors and genres of the page in one query each, keeping the order of each list. */
    private List<BookCardResponse> withCollections(List<Card> cards) {
        if (cards.isEmpty()) {
            return List.of();
        }
        List<Long> ids = cards.stream().map(Card::id).toList();
        Map<Long, List<String>> authors = namesByBook("""
                select ba.book_id, a.name from book_author ba
                join author a on a.id = ba.author_id
                where ba.book_id in (:ids)
                order by ba.book_id, ba.author_order
                """, ids);
        Map<Long, List<String>> genres = namesByBook("""
                select bg.book_id, g.name from book_genre bg
                join genre g on g.id = bg.genre_id
                where bg.book_id in (:ids)
                order by bg.book_id, g.normalized_name
                """, ids);
        return cards.stream()
                .map(card -> new BookCardResponse(
                        card.id(),
                        card.title(),
                        authors.getOrDefault(card.id(), List.of()),
                        card.coverUrl(),
                        card.status(),
                        card.progress(),
                        card.rating(),
                        genres.getOrDefault(card.id(), List.of()),
                        card.ownership(),
                        card.favorite(),
                        card.series(),
                        card.publishedYear()))
                .toList();
    }

    /** The SQL already sorts the rows, and groupingBy keeps that order inside each list. */
    private Map<Long, List<String>> namesByBook(String sql, List<Long> ids) {
        return jdbc
                .sql(sql)
                .param("ids", ids)
                .query((rs, row) -> new BookName(rs.getLong("book_id"), rs.getString("name")))
                .list()
                .stream()
                .collect(Collectors.groupingBy(
                        BookName::bookId, LinkedHashMap::new, Collectors.mapping(BookName::name, Collectors.toList())));
    }

    private static Conditions conditionsOf(ShelfFilter filter) {
        List<String> clauses = new ArrayList<>();
        Map<String, Object> params = new LinkedHashMap<>();
        if (filter.q() != null && !filter.q().isBlank()) {
            // The term and search_text are both normalized, so "aneis" finds "Anéis".
            clauses.add("""
                    (b.search_text like :term escape '\\' or exists (
                        select 1 from book_author ba join author a on a.id = ba.author_id
                        where ba.book_id = b.id and a.normalized_name like :term escape '\\'))""");
            params.put("term", "%" + escapeLike(TextNormalizer.normalize(filter.q())) + "%");
        }
        if (filter.statuses() != null && !filter.statuses().isEmpty()) {
            clauses.add("(" + STATUS + ") in (:statuses)");
            params.put(
                    "statuses",
                    filter.statuses().stream().map(ShelfStatus::name).toList());
        }
        if (filter.ownership() != null) {
            clauses.add("b.ownership = :ownership");
            params.put("ownership", filter.ownership().name());
        }
        if (filter.favorite() != null) {
            clauses.add("b.favorite = :favorite");
            params.put("favorite", filter.favorite());
        }
        if (filter.genreId() != null) {
            // A genre also brings the books tagged only with its subgenres.
            clauses.add("""
                    exists (select 1 from book_genre bg join genre g on g.id = bg.genre_id
                        where bg.book_id = b.id and (g.id = :genreId or g.parent_id = :genreId))""");
            params.put("genreId", filter.genreId());
        }
        if (filter.authorId() != null) {
            clauses.add(
                    "exists (select 1 from book_author ba" + " where ba.book_id = b.id and ba.author_id = :authorId)");
            params.put("authorId", filter.authorId());
        }
        if (filter.publisherId() != null) {
            clauses.add("exists (select 1 from book_publisher bp"
                    + " where bp.book_id = b.id and bp.publisher_id = :publisherId)");
            params.put("publisherId", filter.publisherId());
        }
        if (filter.seriesId() != null) {
            clauses.add("b.series_id = :seriesId");
            params.put("seriesId", filter.seriesId());
        }
        if (filter.listId() != null) {
            clauses.add("exists (select 1 from book_list_item li"
                    + " where li.book_list_id = :listId and li.book_id = b.id)");
            params.put("listId", filter.listId());
        }
        String where = clauses.isEmpty() ? "" : " where " + String.join(" and ", clauses);
        return new Conditions(where, params);
    }

    /** A term with % or _ must match those characters, not work as a wildcard. */
    private static String escapeLike(String term) {
        return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static @Nullable String imageUrl(@Nullable Long imageId) {
        return imageId == null ? null : ImageUrls.of(imageId);
    }

    /** The card only shows progress while the book is being read. */
    private static @Nullable CardProgressResponse progress(
            ShelfStatus status, int pagesRead, @Nullable Integer pageCount) {
        if (status != ShelfStatus.READING) {
            return null;
        }
        int percent = pageCount == null || pageCount <= 0
                ? 0
                : (int) Math.min(COMPLETE, (long) pagesRead * COMPLETE / pageCount);
        return new CardProgressResponse(pagesRead, pageCount, percent);
    }

    private static @Nullable CardSeriesResponse series(
            @Nullable Long id, @Nullable String name, @Nullable BigDecimal position) {
        if (id == null || name == null || position == null) {
            return null;
        }
        return new CardSeriesResponse(id, name, position);
    }

    /** The WHERE built from the filters, with its parameters. Only values reach the SQL as parameters. */
    private record Conditions(String where, Map<String, Object> params) {}

    /** One row of the authors or genres query. */
    private record BookName(long bookId, String name) {}

    private record Card(
            long id,
            String title,
            @Nullable String coverUrl,
            ShelfStatus status,
            @Nullable CardProgressResponse progress,
            @Nullable BigDecimal rating,
            Ownership ownership,
            boolean favorite,
            @Nullable CardSeriesResponse series,
            @Nullable Short publishedYear) {}
}
