package io.github.brunasanguini.minhalivraria.images.application;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** A data folder of its own for each image test class, so files never mix between classes. */
final class ImageTestDataDir {

    private ImageTestDataDir() {}

    static Path create() {
        try {
            return Files.createTempDirectory("minha-livraria-images-");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
