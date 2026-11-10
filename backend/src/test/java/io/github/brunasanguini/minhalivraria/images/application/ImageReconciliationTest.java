package io.github.brunasanguini.minhalivraria.images.application;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.images.domain.Image;
import io.github.brunasanguini.minhalivraria.images.domain.ImageFormat;
import io.github.brunasanguini.minhalivraria.images.domain.ImageRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
class ImageReconciliationTest {

    private static final Path DATA_DIR = ImageTestDataDir.create();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ImageReconciliation reconciliation;

    @Autowired
    private ImageRepository images;

    @Autowired
    private ImageFiles files;

    @BeforeEach
    void startEmpty() throws IOException {
        images.deleteAll();
        ImageTestDataDir.clear(DATA_DIR.resolve("images"));
    }

    @Test
    void shouldPutTheDiskBackInLineWithTheDatabase() throws IOException {
        Instant now = Instant.now();
        Path orphan = files.write(ImageKind.COVER, "orfa.png", ImageSamples.PNG);
        Files.setLastModifiedTime(orphan, FileTime.from(now.minusSeconds(60)));

        Image restorable = images.save(image("restauravel.png"));
        Path inTrash = DATA_DIR.resolve("images/.trash/cover/restauravel.png");
        Files.createDirectories(inTrash.getParent());
        Files.write(inTrash, ImageSamples.PNG);

        images.save(image("sumiu.png"));

        Path expired = DATA_DIR.resolve("images/.trash/banner/antiga.png");
        Files.createDirectories(expired.getParent());
        Files.write(expired, ImageSamples.PNG);
        Files.setLastModifiedTime(expired, FileTime.from(now.minus(Duration.ofDays(31))));

        ImageReconciliation.Result result = reconciliation.reconcile(now);

        assertThat(result).isEqualTo(new ImageReconciliation.Result(1, 1, 1, 1));
        assertThat(DATA_DIR.resolve("images/.trash/cover/orfa.png")).isRegularFile();
        assertThat(orphan).doesNotExist();
        assertThat(files.path(ImageKind.COVER, restorable.fileName())).isRegularFile();
        assertThat(inTrash).doesNotExist();
        assertThat(expired).doesNotExist();
    }

    @Test
    void shouldLeaveFilesWrittenAfterItStartedAlone() {
        Instant startedAt = Instant.now().minusSeconds(60);
        Path recent = files.write(ImageKind.AVATAR, "em-andamento.webp", ImageSamples.WEBP);

        reconciliation.reconcile(startedAt);

        assertThat(recent).isRegularFile();
    }

    private static Image image(String fileName) {
        return new Image(ImageKind.COVER, fileName, ImageFormat.PNG, ImageSamples.PNG.length, "0".repeat(64));
    }
}
