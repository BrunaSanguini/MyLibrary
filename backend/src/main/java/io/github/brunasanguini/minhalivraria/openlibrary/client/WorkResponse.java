package io.github.brunasanguini.minhalivraria.openlibrary.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A work ({@code /works/OL...W.json}), which groups the editions of the same book.
 *
 * @param description plain text or an object {@code { "type", "value" }}, depending on the record
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkResponse(
        @Nullable String key,
        @Nullable String title,
        @Nullable Object description,
        @Nullable List<AuthorRole> authors) {

    /** {@code { "author": { "key": "/authors/OL26320A" }, "type": ... }}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AuthorRole(@Nullable KeyReference author) {}
}
