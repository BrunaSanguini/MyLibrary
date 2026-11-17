package io.github.brunasanguini.minhalivraria.goals;

/** What a goal counts (docs/modelo-de-dados.md). */
public enum GoalType {
    /** Readings finished in the period, rereads included. */
    BOOKS,
    /** Pages read in the period. */
    PAGES,
    /** Readings marked as reread and finished in the year. */
    REREADS
}
