package io.github.brunasanguini.minhalivraria.books.application;

/** Answer of a cover upload: the URL the front-end puts straight into the img tag. */
public record CoverResponse(String coverUrl) {}
