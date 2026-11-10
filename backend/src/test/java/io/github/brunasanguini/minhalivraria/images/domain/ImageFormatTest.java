package io.github.brunasanguini.minhalivraria.images.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import org.junit.jupiter.api.Test;

class ImageFormatTest {

    @Test
    void shouldRecognizeTheAcceptedFormatsByTheirSignature() {
        assertThat(ImageFormat.detect(ImageSamples.JPEG)).contains(ImageFormat.JPEG);
        assertThat(ImageFormat.detect(ImageSamples.PNG)).contains(ImageFormat.PNG);
        assertThat(ImageFormat.detect(ImageSamples.WEBP)).contains(ImageFormat.WEBP);
    }

    @Test
    void shouldRefuseContentThatIsNotAnAcceptedImage() {
        assertThat(ImageFormat.detect(ImageSamples.TEXT_NAMED_AS_PNG)).isEmpty();
        assertThat(ImageFormat.detect(new byte[0])).isEmpty();
        assertThat(ImageFormat.detect(new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'A', 'V', 'E'}))
                .isEmpty();
    }

    @Test
    void shouldMapContentTypesBackToFormats() {
        assertThat(ImageFormat.fromContentType("image/webp")).isEqualTo(ImageFormat.WEBP);
        assertThat(ImageFormat.JPEG.extension()).isEqualTo("jpg");
        assertThatIllegalArgumentException().isThrownBy(() -> ImageFormat.fromContentType("image/gif"));
    }
}
