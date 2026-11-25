package io.github.brunasanguini.minhalivraria.shelf.application;

/**
 * The numbers of the tabs and chips of Minha Estante. All of them except {@code wishlist} count only the books outside
 * the wishlist.
 *
 * @param shelf every book outside the wishlist: the sum of the four statuses
 * @param rereads read more than once, or with a reading marked as a reread
 */
public record ShelfSummaryResponse(
        long shelf,
        long reading,
        long read,
        long wantToRead,
        long abandoned,
        long wishlist,
        long favorites,
        long rereads) {}
