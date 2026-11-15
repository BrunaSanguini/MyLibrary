/**
 * Client of the Open Library: search, editions and covers. It only talks HTTP and has no controller; importing a
 * book into the collection belongs to {@code books}.
 *
 * <p>Other modules use {@link io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryClient} and its records.
 * The JSON shapes of the Open Library stay in the {@code client} subpackage and never leave the module (ADR-0004).
 */
@NullMarked
package io.github.brunasanguini.minhalivraria.openlibrary;

import org.jspecify.annotations.NullMarked;
