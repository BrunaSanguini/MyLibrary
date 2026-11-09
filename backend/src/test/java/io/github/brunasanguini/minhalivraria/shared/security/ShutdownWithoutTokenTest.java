package io.github.brunasanguini.minhalivraria.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = WebSliceTest.NoControllers.class, properties = "app.shutdown-token=")
class ShutdownWithoutTokenTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void shouldHideShutdownWhenNoTokenIsConfigured() {
        assertThat(mvc.post().uri("/actuator/shutdown").header(ShutdownTokenFilter.HEADER, "qualquer-token"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("resource.not-found");
    }
}
