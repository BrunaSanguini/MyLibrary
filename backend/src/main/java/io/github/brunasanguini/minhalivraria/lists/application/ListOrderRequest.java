package io.github.brunasanguini.minhalivraria.lists.application;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/** The books of a list in their new order: exactly the books it has, each one once. */
public record ListOrderRequest(@NotNull List<@NotNull Long> bookIds) {}
