package io.github.brunasanguini.minhalivraria.openlibrary.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.jspecify.annotations.Nullable;

/** How the Open Library points to another record: {@code { "key": "/authors/OL26320A" }}. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KeyReference(@Nullable String key) {}
