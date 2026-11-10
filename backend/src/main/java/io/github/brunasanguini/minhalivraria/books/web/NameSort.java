package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Catalog listings sort only by name ({@code sort=name,asc|desc}), ignoring case and accents. */
final class NameSort {

    private static final Map<String, String> FIELDS = Map.of("name", "normalizedName");
    private static final Sort DEFAULT = Sort.by("normalizedName");

    private NameSort() {}

    static Pageable pageable(PageQuery query) {
        return query.toPageable(FIELDS, DEFAULT);
    }
}
