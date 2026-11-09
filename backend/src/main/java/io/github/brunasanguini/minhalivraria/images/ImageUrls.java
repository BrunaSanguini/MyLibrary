package io.github.brunasanguini.minhalivraria.images;

/** URLs of images as the API returns them, such as {@code "coverUrl": "/api/v1/images/17"}. */
public final class ImageUrls {

    private ImageUrls() {}

    public static String of(long imageId) {
        return "/api/v1/images/" + imageId;
    }
}
