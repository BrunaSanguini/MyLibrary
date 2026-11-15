package io.github.brunasanguini.minhalivraria.openlibrary.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * An edition ({@code /books/OL...M.json}). Every field may be missing.
 *
 * @param description plain text or an object {@code { "type", "value" }}, depending on the record
 * @param publishDate free text, such as {@code "2019-07-15"}, {@code "1986"} or {@code "1 Deccember 2021"}
 * @param covers cover ids; the list may carry nulls and {@code -1}
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EditionResponse(
        @Nullable String key,
        @Nullable String title,
        @Nullable String subtitle,
        @Nullable List<KeyReference> authors,
        @Nullable List<KeyReference> works,
        @Nullable List<String> publishers,
        @JsonProperty("publish_date") @Nullable String publishDate,
        @JsonProperty("number_of_pages") @Nullable Integer numberOfPages,
        @JsonProperty("isbn_13") @Nullable List<String> isbn13,
        @JsonProperty("isbn_10") @Nullable List<String> isbn10,
        @Nullable List<KeyReference> languages,
        @Nullable Object description,
        @Nullable List<@Nullable Long> covers) {}
