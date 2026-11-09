package io.github.brunasanguini.minhalivraria.images.application;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageStore;
import io.github.brunasanguini.minhalivraria.images.domain.Image;
import io.github.brunasanguini.minhalivraria.images.domain.ImageFormat;
import io.github.brunasanguini.minhalivraria.images.domain.ImageRepository;
import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.error.PayloadTooLargeException;
import io.github.brunasanguini.minhalivraria.shared.error.UnsupportedMediaTypeException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@Transactional(readOnly = true)
public class ImageService implements ImageStore {

    private static final Logger log = LoggerFactory.getLogger(ImageService.class);

    private final ImageRepository images;
    private final ImageFiles files;
    private final ApplicationEventPublisher events;
    private final long maxSizeBytes;

    ImageService(ImageRepository images, ImageFiles files, ApplicationEventPublisher events, AppProperties properties) {
        this.images = images;
        this.files = files;
        this.events = events;
        this.maxSizeBytes = properties.images().maxSize().toBytes();
    }

    @Override
    @Transactional
    public long store(ImageKind kind, byte[] content) {
        if (content.length > maxSizeBytes) {
            throw new PayloadTooLargeException("image.too-large");
        }
        ImageFormat format =
                ImageFormat.detect(content).orElseThrow(() -> new UnsupportedMediaTypeException("image.invalid-type"));

        // The file is written before the row exists, so it must go away if the transaction fails.
        String fileName = UUID.randomUUID() + "." + format.extension();
        files.write(kind, fileName, content);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    files.delete(kind, fileName);
                }
            }
        });

        return images.save(new Image(kind, fileName, format, content.length, sha256(content)))
                .id();
    }

    @Override
    @Transactional
    public void discard(long imageId) {
        images.findById(imageId).ifPresent(image -> {
            images.delete(image);
            events.publishEvent(new ImageDiscarded(image.kind(), image.fileName()));
        });
    }

    /** The image to send to the browser, or {@code image.not-found} when the row or the file is missing. */
    public ImageFile load(long imageId) {
        Image image = images.findById(imageId).orElseThrow(() -> new NotFoundException("image.not-found"));
        if (!files.exists(image.kind(), image.fileName())) {
            log.warn("Image {} has no file on disk ({})", imageId, image.fileName());
            throw new NotFoundException("image.not-found");
        }
        return new ImageFile(files.path(image.kind(), image.fileName()), image.contentType(), image.sha256());
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available in the JDK", e);
        }
    }
}
