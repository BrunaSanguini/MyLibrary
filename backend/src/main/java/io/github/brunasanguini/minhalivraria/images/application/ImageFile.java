package io.github.brunasanguini.minhalivraria.images.application;

import java.nio.file.Path;

/** An image ready to be sent: where it is, its content type and the hash used as ETag. */
public record ImageFile(Path path, String contentType, String sha256) {}
