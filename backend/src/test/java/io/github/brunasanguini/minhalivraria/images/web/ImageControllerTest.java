package io.github.brunasanguini.minhalivraria.images.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.images.application.ImageFile;
import io.github.brunasanguini.minhalivraria.images.application.ImageService;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = ImageController.class)
class ImageControllerTest {

    private static final String SHA256 = "a".repeat(64);

    @TempDir
    Path folder;

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ImageService images;

    @Test
    void shouldServeTheImageWithPermanentCache() throws IOException {
        givenImage(17);

        assertThat(mvc.get().uri("/api/v1/images/17"))
                .hasStatusOk()
                .hasContentType("image/png")
                .hasHeader(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable")
                .hasHeader(HttpHeaders.ETAG, "\"" + SHA256 + "\"");
    }

    @Test
    void shouldAnswerNotModifiedWhenTheBrowserAlreadyHasIt() throws IOException {
        givenImage(17);

        assertThat(mvc.get().uri("/api/v1/images/17").header(HttpHeaders.IF_NONE_MATCH, "\"" + SHA256 + "\""))
                .hasStatus(HttpStatus.NOT_MODIFIED);
    }

    @Test
    void shouldAnswerUnknownImagesWithNotFound() {
        given(images.load(99)).willThrow(new NotFoundException("image.not-found"));

        assertThat(mvc.get().uri("/api/v1/images/99"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("image.not-found");
    }

    private void givenImage(long id) throws IOException {
        Path file = Files.write(folder.resolve("capa.png"), ImageSamples.PNG);
        given(images.load(id)).willReturn(new ImageFile(file, "image/png", SHA256));
    }
}
