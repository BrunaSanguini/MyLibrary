package io.github.brunasanguini.minhalivraria.openlibrary.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** Result of {@code /search.json}: one document per work, with the edition that best matches the search. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SearchResponse(@Nullable List<Work> docs) {

    /**
     * @param key such as {@code /works/OL27448W}
     * @param coverEditionKey edition of the work's cover, used when the search brings no edition
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Work(
            @Nullable String key,
            @Nullable String title,
            @JsonProperty("author_name") @Nullable List<String> authorNames,
            @JsonProperty("first_publish_year") @Nullable Integer firstPublishYear,
            @JsonProperty("cover_i") @Nullable Long coverId,
            @JsonProperty("cover_edition_key") @Nullable String coverEditionKey,
            @Nullable Editions editions) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Editions(@Nullable List<Edition> docs) {}

    /**
     * @param key such as {@code /books/OL51694024M}
     * @param publishDates free text, like the date of an edition
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Edition(
            @Nullable String key,
            @Nullable String title,
            @JsonProperty("cover_i") @Nullable Long coverId,
            @JsonProperty("publish_date") @Nullable List<String> publishDates) {}
}
