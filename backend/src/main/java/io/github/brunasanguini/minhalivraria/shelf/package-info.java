/**
 * Read side of the collection: the book cards every listing uses, with filters, accent-insensitive search and
 * pagination.
 *
 * <p>Writes nothing, and no module depends on it. It is the only module allowed to read other modules' tables, which
 * it does with {@code JdbcClient} instead of going through their entities (ADR-0005).
 */
@NullMarked
package io.github.brunasanguini.minhalivraria.shelf;

import org.jspecify.annotations.NullMarked;
