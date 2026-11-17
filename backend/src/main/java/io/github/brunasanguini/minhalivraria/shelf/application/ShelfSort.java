package io.github.brunasanguini.minhalivraria.shelf.application;

import java.util.Map;
import org.springframework.data.domain.Sort;

/**
 * The sort fields the shelf accepts, and the SQL each one becomes. {@code PageQuery} rejects anything outside this
 * map with {@code request.invalid-sort}, so only these strings ever reach the SQL.
 *
 * <p>{@code listOrder} is the position of the book in the list of the {@code listId} filter, so it only works with
 * that filter: its SQL uses the {@code :listId} parameter.
 */
final class ShelfSort {

    static final String LIST_ORDER =
            "(select li.item_order from book_list_item li" + " where li.book_list_id = :listId and li.book_id = b.id)";

    /** {@code search_text} starts with the normalized title, which is the alphabetical order the shelf wants. */
    static final Map<String, String> COLUMNS = Map.of(
            "title", "b.search_text",
            "author", "a0.normalized_name",
            "addedAt", "b.created_at",
            "seriesPosition", "b.series_position",
            "rating", "rv.rating",
            "listOrder", LIST_ORDER,
            "finishedAt", "(select max(r.end_date) from reading r where r.book_id = b.id and r.status = 'FINISHED')");

    static final Sort DEFAULT = Sort.by(Sort.Direction.DESC, "b.created_at");

    private ShelfSort() {}

    /** Builds the ORDER BY from a Sort whose properties are already columns, always ending with the id. */
    static String orderBy(Sort sort) {
        StringBuilder clause = new StringBuilder();
        for (Sort.Order order : sort) {
            clause.append(order.getProperty())
                    .append(order.isAscending() ? " asc" : " desc")
                    .append(" nulls last, ");
        }
        // Keeps the pages stable when the sort column repeats.
        return clause.append("b.id asc").toString();
    }
}
