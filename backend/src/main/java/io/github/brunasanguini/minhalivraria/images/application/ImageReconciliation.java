package io.github.brunasanguini.minhalivraria.images.application;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.domain.Image;
import io.github.brunasanguini.minhalivraria.images.domain.ImageRepository;
import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Puts the disk back in line with the database after startup (docs/modelo-de-dados.md):
 *
 * <ul>
 *   <li>a file without a row goes to the trash;
 *   <li>a row without a file is restored from the trash, or logged when the trash no longer has it;
 *   <li>files older than the retention leave the trash.
 * </ul>
 *
 * Files written after the reconciliation started are left alone: they may belong to a transaction that has not
 * committed yet.
 */
@Component
class ImageReconciliation {

    private static final Logger log = LoggerFactory.getLogger(ImageReconciliation.class);

    private final ImageRepository images;
    private final ImageFiles files;
    private final Clock clock;
    private final Duration trashRetention;
    private final Executor executor;

    ImageReconciliation(
            ImageRepository images,
            ImageFiles files,
            Clock clock,
            AppProperties properties,
            @Qualifier("applicationTaskExecutor") Executor executor) {
        this.images = images;
        this.files = files;
        this.clock = clock;
        this.trashRetention = properties.images().trashRetention();
        this.executor = executor;
    }

    /** Runs in the background, so the app is ready without waiting for the disk. */
    @EventListener(ApplicationReadyEvent.class)
    void onApplicationReady() {
        Instant startedAt = clock.instant();
        executor.execute(() -> {
            try {
                reconcile(startedAt);
            } catch (RuntimeException e) {
                log.error("Image reconciliation failed", e);
            }
        });
    }

    Result reconcile(Instant startedAt) {
        Map<ImageKind, Set<String>> known = images.findAll().stream()
                .collect(Collectors.groupingBy(Image::kind, Collectors.mapping(Image::fileName, Collectors.toSet())));

        int trashed = 0;
        int restored = 0;
        int missing = 0;
        for (ImageKind kind : ImageKind.values()) {
            Set<String> fileNames = known.getOrDefault(kind, Set.of());
            for (ImageFiles.StoredFile file : files.list(kind)) {
                if (!fileNames.contains(file.fileName()) && file.modifiedAt().isBefore(startedAt)) {
                    files.moveToTrash(kind, file.fileName());
                    trashed++;
                }
            }
            for (String fileName : fileNames) {
                if (files.exists(kind, fileName)) {
                    continue;
                }
                if (files.restoreFromTrash(kind, fileName)) {
                    restored++;
                } else {
                    log.warn("Image {} of kind {} is missing on disk; the default image is shown", fileName, kind);
                    missing++;
                }
            }
        }
        int purged = files.purgeTrash(startedAt.minus(trashRetention));

        Result result = new Result(trashed, restored, missing, purged);
        if (!result.isEmpty()) {
            log.info("Image reconciliation: {}", result);
        }
        return result;
    }

    record Result(int trashed, int restored, int missing, int purged) {

        boolean isEmpty() {
            return trashed + restored + missing + purged == 0;
        }
    }
}
