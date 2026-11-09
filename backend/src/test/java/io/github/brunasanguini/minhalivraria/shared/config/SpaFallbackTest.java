package io.github.brunasanguini.minhalivraria.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Uses src/test/resources/static/index.html in place of the Angular build. */
@WebSliceTest
class SpaFallbackTest {

    @Autowired
    private MockMvcTester mvc;

    @ParameterizedTest
    @ValueSource(strings = {"/estante", "/livros/42", "/livros/42/editar"})
    void shouldServeTheAppForFrontendRoutes(String route) {
        assertThat(mvc.get().uri(route)).hasStatusOk().bodyText().contains("minha-livraria-test-index");
    }

    @Test
    void shouldAnswerMissingFilesWith404() {
        assertThat(mvc.get().uri("/media/fonte-inexistente.woff2")).hasStatus(HttpStatus.NOT_FOUND);
    }

    @ParameterizedTest
    @ValueSource(strings = {"api/v1/books", "actuator/health", "v3/api-docs", "swagger-ui/index.html", "main.js"})
    void shouldNotTreatBackendPathsOrFilesAsFrontendRoutes(String resourcePath) {
        assertThat(SpaFallbackResourceResolver.isFrontendRoute(resourcePath)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "estante", "livros/42/leitura", "catalogos"})
    void shouldTreatPathsWithoutExtensionAsFrontendRoutes(String resourcePath) {
        assertThat(SpaFallbackResourceResolver.isFrontendRoute(resourcePath)).isTrue();
    }
}
