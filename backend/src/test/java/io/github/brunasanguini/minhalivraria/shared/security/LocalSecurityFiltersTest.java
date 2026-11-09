package io.github.brunasanguini.minhalivraria.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(properties = "app.shutdown-token=token-do-hub")
class LocalSecurityFiltersTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void shouldRefuseRequestsAddressedToAnotherHost() {
        assertThat(mvc.get().uri("http://site-malicioso.example/api/v1/books"))
                .hasStatus(HttpStatus.FORBIDDEN)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid-host");
    }

    @Test
    void shouldAcceptRequestsAddressedTo127001() {
        int status = mvc.get().uri("http://127.0.0.1/estante").exchange().getResponse().getStatus();

        assertThat(status).isNotEqualTo(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void shouldRefuseApiChangesWithoutRequestedByHeader() {
        assertThat(mvc.post().uri("/api/v1/books"))
                .hasStatus(HttpStatus.FORBIDDEN)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.missing-header");
    }

    @Test
    void shouldLetApiChangesWithRequestedByHeaderThrough() {
        int status = mvc.post()
                .uri("/api/v1/books")
                .header(RequestedByFilter.HEADER, RequestedByFilter.EXPECTED_VALUE)
                .exchange()
                .getResponse()
                .getStatus();

        assertThat(status).isNotEqualTo(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void shouldNotRequireRequestedByHeaderForReads() {
        int status = mvc.get().uri("/api/v1/books").exchange().getResponse().getStatus();

        assertThat(status).isNotEqualTo(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void shouldRefuseShutdownWithoutToken() {
        assertThat(mvc.post().uri("/actuator/shutdown"))
                .hasStatus(HttpStatus.FORBIDDEN)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid-token");
    }

    @Test
    void shouldRefuseShutdownWithWrongToken() {
        assertThat(mvc.post().uri("/actuator/shutdown").header(ShutdownTokenFilter.HEADER, "token-errado"))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldLetShutdownWithTheRightTokenThrough() {
        int status = mvc.post()
                .uri("/actuator/shutdown")
                .header(ShutdownTokenFilter.HEADER, "token-do-hub")
                .exchange()
                .getResponse()
                .getStatus();

        assertThat(status).isNotEqualTo(HttpStatus.FORBIDDEN.value());
    }
}
