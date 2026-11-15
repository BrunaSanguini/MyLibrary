package io.github.brunasanguini.minhalivraria.openlibrary.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.jspecify.annotations.Nullable;

/** An author ({@code /authors/OL...A.json}). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AuthorResponse(
        @Nullable String key,
        @Nullable String name,
        @JsonProperty("personal_name") @Nullable String personalName) {}
