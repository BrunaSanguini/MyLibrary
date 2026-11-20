package io.github.brunasanguini.minhalivraria.lists.domain;

/** The cover color of a list: one of the six of the design system (forest, plum, night, rust, seal and moss). */
public enum ListColor {
    FOREST,
    PLUM,
    NIGHT,
    RUST,
    SEAL,
    MOSS;

    /** The color of a list created without choosing one. */
    public static final ListColor DEFAULT = PLUM;
}
