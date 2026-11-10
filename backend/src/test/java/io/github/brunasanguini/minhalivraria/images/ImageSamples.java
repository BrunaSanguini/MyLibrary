package io.github.brunasanguini.minhalivraria.images;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Byte contents for the image tests: only the signature matters to the format detection. */
public final class ImageSamples {

    public static final byte[] PNG = withBody(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
    public static final byte[] JPEG = withBody(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0});
    public static final byte[] WEBP = withBody(new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'});

    /** A text file someone renamed to capa.png. */
    public static final byte[] TEXT_NAMED_AS_PNG = "não sou uma imagem".getBytes(StandardCharsets.UTF_8);

    private ImageSamples() {}

    public static byte[] ofSize(byte[] signature, int size) {
        return Arrays.copyOf(signature, size);
    }

    private static byte[] withBody(byte[] signature) {
        return Arrays.copyOf(signature, signature.length + 64);
    }
}
