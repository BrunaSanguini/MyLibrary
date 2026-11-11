package io.github.brunasanguini.minhalivraria.shelf.application;

import java.util.Map;
import org.springframework.data.domain.Sort;

/**
 * The sort fields the shelf accepts, and the column each one becomes. {@code PageQuery} rejects anything outside this
 * map with {@code request.invalid-sort}, so only these four strings ever reach the SQL.
 *
 * <p>{@code rating}, {@code finishedAt} and {@code listOrder} arrive with the readings and the lists.
 */
final class ShelfSort {

    /** {@code search_text} starts with the normalized title, which is the alphabetical order the shelf wants. */
    static final Map<String, String> COLUMNS = Map.of(
            "title", "b.search_text",
            "author", "a0.normalized_name",
            "addedAt", "b.created_at",
            "seriesPosition", "b.series_position");

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
