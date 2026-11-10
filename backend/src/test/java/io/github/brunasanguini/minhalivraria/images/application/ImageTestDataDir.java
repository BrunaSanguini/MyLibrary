package io.github.brunasanguini.minhalivraria.images.application;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.stream.Stream;

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

    /** Deletes the folder and everything inside it, if it exists. */
    static void clear(Path folder) throws IOException {
        if (!Files.exists(folder)) {
            return;
        }
        try (Stream<Path> paths = Files.walk(folder)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.delete(path);
            }
        }
    }
}
