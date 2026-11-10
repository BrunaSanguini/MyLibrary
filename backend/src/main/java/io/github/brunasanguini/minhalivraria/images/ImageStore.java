package io.github.brunasanguini.minhalivraria.images;

/**
 * Public API of the images module. Both methods join the caller's transaction, so the image follows what happens to
 * the book or profile that uses it.
 */
public interface ImageStore {

    /**
     * Validates and saves an image.
     *
     * <p>The format is detected from the content, never from the file name. If the transaction rolls back, the file
     * is deleted.
     *
     * @return the id of the new image
     * @throws io.github.brunasanguini.minhalivraria.shared.error.UnsupportedMediaTypeException {@code
     *     image.invalid-type}, when the content is not JPEG, PNG or WebP
     * @throws io.github.brunasanguini.minhalivraria.shared.error.PayloadTooLargeException {@code image.too-large},
     *     when the content is bigger than {@code app.images.max-size}
     */
    long store(ImageKind kind, byte[] content);

    /**
     * Discards an image that is no longer used, such as a replaced cover. The file goes to the trash only after the
     * transaction commits, and stays there for {@code app.images.trash-retention}. Unknown ids are ignored.
     */
    void discard(long imageId);
}
