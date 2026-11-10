package io.github.brunasanguini.minhalivraria.books.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublisherRequest(@NotBlank @Size(max = 200) String name) {}
