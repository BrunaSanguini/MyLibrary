package io.github.brunasanguini.minhalivraria.shared.web;

import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Locale;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Pagination query params: {@code page} (from 0), {@code size} (24 by default, at most 100) and {@code
 * sort=field,asc|desc}. Each endpoint accepts only its own list of sort fields; anything else is {@code
 * request.invalid-sort}.
 */
public record PageQuery(
        @Min(0) @Nullable Integer page,
        @Min(1) @Max(MAX_SIZE) @Nullable Integer size,
        @Nullable String sort) {

    public static final int DEFAULT_SIZE = 24;
    public static final int MAX_SIZE = 100;

    /**
     * @param sortFields API sort field to entity property, such as {@code "name" -> "normalizedName"}
     * @param defaultSort used when the request has no sort
     */
    public Pageable toPageable(Map<String, String> sortFields, Sort defaultSort) {
        int pageIndex = page == null ? 0 : page;
        int pageSize = size == null ? DEFAULT_SIZE : size;
        return PageRequest.of(pageIndex, pageSize, parseSort(sortFields, defaultSort));
    }

    private Sort parseSort(Map<String, String> sortFields, Sort defaultSort) {
        if (sort == null || sort.isBlank()) {
            return defaultSort;
        }
        String[] parts = sort.split(",", -1);
        String property = sortFields.get(parts[0].strip());
        if (property == null || parts.length > 2) {
            throw new BadRequestException("request.invalid-sort");
        }
        Sort.Direction direction = parts.length == 2 ? direction(parts[1]) : Sort.Direction.ASC;
        return Sort.by(direction, property);
    }

    private static Sort.Direction direction(String value) {
        return switch (value.strip().toLowerCase(Locale.ROOT)) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw new BadRequestException("request.invalid-sort");
        };
    }
}
