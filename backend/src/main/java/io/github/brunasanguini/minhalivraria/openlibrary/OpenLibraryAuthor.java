package io.github.brunasanguini.minhalivraria.openlibrary;

/**
 * An author as the Open Library knows it.
 *
 * @param key the Open Library id, such as {@code OL26320A}
 */
public record OpenLibraryAuthor(String key, String name) {}
