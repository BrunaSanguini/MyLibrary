package io.github.brunasanguini.minhalivraria.images.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.images.domain.Image;
import io.github.brunasanguini.minhalivraria.images.domain.ImageRepository;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.error.PayloadTooLargeException;
import io.github.brunasanguini.minhalivraria.shared.error.UnsupportedMediaTypeException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class ImageServiceTest {

    private static final Path DATA_DIR = ImageTestDataDir.create();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ImageService service;

    @Autowired
    private ImageRepository images;

    @Autowired
    private ImageFiles files;

    @Autowired
    private TransactionTemplate transaction;

    @Test
    void shouldSaveTheFileAndItsRecord() throws IOException {
        long id = service.store(ImageKind.COVER, ImageSamples.PNG);

        Image image = images.findById(id).orElseThrow();
        assertThat(image.kind()).isEqualTo(ImageKind.COVER);
        assertThat(image.contentType()).isEqualTo("image/png");
        assertThat(image.sizeBytes()).isEqualTo(ImageSamples.PNG.length);
        assertThat(image.fileName()).endsWith(".png");
        assertThat(image.sha256()).hasSize(64);
        assertThat(image.createdAt()).isNotNull();
        Path file = DATA_DIR.resolve("images/cover").resolve(image.fileName());
        assertThat(Files.readAllBytes(file)).isEqualTo(ImageSamples.PNG);
    }

    @Test
    void shouldRefuseContentThatIsNotAnImageWhateverItsName() {
        assertThatThrownBy(() -> service.store(ImageKind.COVER, ImageSamples.TEXT_NAMED_AS_PNG))
                .isInstanceOf(UnsupportedMediaTypeException.class)
                .extracting("code")
                .isEqualTo("image.invalid-type");
    }

    @Test
    void shouldRefuseImagesAboveTheSizeLimit() {
        byte[] tooLarge = ImageSamples.ofSize(ImageSamples.JPEG, 5 * 1024 * 1024 + 1);

        assertThatThrownBy(() -> service.store(ImageKind.BANNER, tooLarge))
                .isInstanceOf(PayloadTooLargeException.class)
                .extracting("code")
                .isEqualTo("image.too-large");
    }

    @Test
    void shouldDeleteTheFileWhenTheTransactionRollsBack() {
        List<String> before = fileNames(ImageKind.AVATAR);

        transaction.executeWithoutResult(status -> {
            service.store(ImageKind.AVATAR, ImageSamples.WEBP);
            status.setRollbackOnly();
        });

        assertThat(fileNames(ImageKind.AVATAR)).isEqualTo(before);
    }

    @Test
    void shouldMoveADiscardedImageToTheTrashAfterTheCommit() {
        long id = service.store(ImageKind.COVER, ImageSamples.JPEG);
        String fileName = images.findById(id).orElseThrow().fileName();

        service.discard(id);

        assertThat(images.findById(id)).isEmpty();
        assertThat(DATA_DIR.resolve("images/cover").resolve(fileName)).doesNotExist();
        assertThat(DATA_DIR.resolve("images/.trash/cover").resolve(fileName)).isRegularFile();
    }

    @Test
    void shouldKeepTheFileWhenTheDiscardRollsBack() {
        long id = service.store(ImageKind.COVER, ImageSamples.JPEG);
        String fileName = images.findById(id).orElseThrow().fileName();

        transaction.executeWithoutResult(status -> {
            service.discard(id);
            status.setRollbackOnly();
        });

        assertThat(images.findById(id)).isPresent();
        assertThat(DATA_DIR.resolve("images/cover").resolve(fileName)).isRegularFile();
    }

    @Test
    void shouldIgnoreTheDiscardOfAnUnknownImage() {
        service.discard(999_999);

        assertThat(images.findById(999_999L)).isEmpty();
    }

    @Test
    void shouldLoadAStoredImage() {
        long id = service.store(ImageKind.BANNER, ImageSamples.WEBP);

        ImageFile file = service.load(id);

        assertThat(file.contentType()).isEqualTo("image/webp");
        assertThat(file.path()).isRegularFile();
        assertThat(file.sha256()).isEqualTo(images.findById(id).orElseThrow().sha256());
    }

    @Test
    void shouldReportAnImageWhoseFileIsMissingAsNotFound() {
        long id = service.store(ImageKind.BANNER, ImageSamples.PNG);
        files.delete(ImageKind.BANNER, images.findById(id).orElseThrow().fileName());

        assertThatThrownBy(() -> service.load(id))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("image.not-found");
    }

    @Test
    void shouldReportAnUnknownImageAsNotFound() {
        assertThatThrownBy(() -> service.load(999_999)).isInstanceOf(NotFoundException.class);
    }

    private List<String> fileNames(ImageKind kind) {
        return files.list(kind).stream().map(ImageFiles.StoredFile::fileName).sorted().toList();
    }
}
