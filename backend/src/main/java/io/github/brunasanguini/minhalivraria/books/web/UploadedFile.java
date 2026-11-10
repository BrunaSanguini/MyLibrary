package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.web.multipart.MultipartFile;

/** Content of an uploaded part. The format and the size are checked by the images module. */
final class UploadedFile {

    private UploadedFile() {}

    static byte[] bytesOf(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("request.invalid");
        }
        try {
            return file.getBytes();
        } catch (IOException exception) {
            // Reading the temporary file failed, which is a server problem, not a bad request.
            throw new UncheckedIOException(exception);
        }
    }
}
