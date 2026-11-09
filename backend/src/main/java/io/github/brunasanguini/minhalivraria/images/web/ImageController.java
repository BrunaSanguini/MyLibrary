package io.github.brunasanguini.minhalivraria.images.web;

import io.github.brunasanguini.minhalivraria.images.application.ImageFile;
import io.github.brunasanguini.minhalivraria.images.application.ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "images", description = "Covers, banners and avatar saved on disk")
@RestController
@RequestMapping("/images")
class ImageController {

    /** An image never changes (replacing a cover creates a new one), so the browser can keep it forever. */
    private static final CacheControl FOREVER =
            CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

    private final ImageService images;

    ImageController(ImageService images) {
        this.images = images;
    }

    /** The image file. A matching If-None-Match gets 304, handled by Spring from the ETag. */
    @Operation(
            operationId = "getImage",
            summary = "Image file",
            description = "Served with a permanent cache and the content hash as ETag. Unknown images: 404"
                    + " image.not-found.")
    @GetMapping("/{id}")
    ResponseEntity<Resource> get(@PathVariable long id) {
        ImageFile image = images.load(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(FOREVER)
                .eTag(image.sha256())
                .body(new FileSystemResource(image.path()));
    }
}
