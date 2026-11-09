package io.github.brunasanguini.minhalivraria.images.application;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileTime;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * The image folders on disk: {@code images/{kind}/{fileName}} and the trash, {@code images/.trash/{kind}/{fileName}}.
 * The moment a file enters the trash is its modification time.
 */
@Component
class ImageFiles {

    private static final Logger log = LoggerFactory.getLogger(ImageFiles.class);

    private final Path root;
    private final Path trash;
    private final Clock clock;

    ImageFiles(AppProperties properties, Clock clock) {
        this.root = properties.dataDir().resolve("images");
        this.trash = root.resolve(".trash");
        this.clock = clock;
    }

    Path path(ImageKind kind, String fileName) {
        return folder(root, kind).resolve(fileName);
    }

    /** Writes to a temporary file first, so a half-written image never appears under its final name. */
    Path write(ImageKind kind, String fileName, byte[] content) {
        Path target = path(kind, fileName);
        try {
            Files.createDirectories(target.getParent());
            Path temporary = Files.createTempFile(target.getParent(), "upload-", ".tmp");
            Files.write(temporary, content);
            move(temporary, target);
            return target;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save image " + target, e);
        }
    }

    void delete(ImageKind kind, String fileName) {
        Path file = path(kind, fileName);
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Could not delete image {}; the next reconciliation moves it to the trash", file, e);
        }
    }

    boolean exists(ImageKind kind, String fileName) {
        return Files.isRegularFile(path(kind, fileName));
    }

    /** Files of the kind's folder, with their modification time. */
    List<StoredFile> list(ImageKind kind) {
        return listRegularFiles(folder(root, kind));
    }

    void moveToTrash(ImageKind kind, String fileName) {
        Path source = path(kind, fileName);
        if (!Files.exists(source)) {
            return;
        }
        Path target = folder(trash, kind).resolve(fileName);
        try {
            Files.createDirectories(target.getParent());
            move(source, target);
            Files.setLastModifiedTime(target, FileTime.from(clock.instant()));
        } catch (IOException e) {
            log.warn("Could not move image {} to the trash", source, e);
        }
    }

    boolean restoreFromTrash(ImageKind kind, String fileName) {
        Path source = folder(trash, kind).resolve(fileName);
        if (!Files.isRegularFile(source)) {
            return false;
        }
        try {
            Path target = path(kind, fileName);
            Files.createDirectories(target.getParent());
            move(source, target);
            return true;
        } catch (IOException e) {
            log.warn("Could not restore image {} from the trash", source, e);
            return false;
        }
    }

    /** Deletes the files that entered the trash before {@code limit}. */
    int purgeTrash(Instant limit) {
        int purged = 0;
        for (ImageKind kind : ImageKind.values()) {
            for (StoredFile file : listRegularFiles(folder(trash, kind))) {
                if (file.modifiedAt().isBefore(limit)) {
                    try {
                        Files.delete(file.path());
                        purged++;
                    } catch (IOException e) {
                        log.warn("Could not delete image {} from the trash", file.path(), e);
                    }
                }
            }
        }
        return purged;
    }

    private static Path folder(Path base, ImageKind kind) {
        return base.resolve(kind.name().toLowerCase(Locale.ROOT));
    }

    private static List<StoredFile> listRegularFiles(Path folder) {
        if (!Files.isDirectory(folder)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(folder)) {
            return files.filter(Files::isRegularFile)
                    .filter(file -> !file.getFileName().toString().endsWith(".tmp"))
                    .map(ImageFiles::stored)
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not list images in " + folder, e);
        }
    }

    private static StoredFile stored(Path file) {
        try {
            return new StoredFile(file, Files.getLastModifiedTime(file).toInstant());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void move(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    record StoredFile(Path path, Instant modifiedAt) {

        String fileName() {
            return path.getFileName().toString();
        }
    }
}
