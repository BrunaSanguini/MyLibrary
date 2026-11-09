package io.github.brunasanguini.minhalivraria;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest
@AutoConfigureMockMvc
class MinhaLivrariaApplicationIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private JdbcClient jdbc;

    @Test
    void shouldReportReadyOnceStarted() {
        assertThat(mvc.get().uri("/actuator/health/readiness"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("UP");
    }

    @Test
    void shouldExposeBuildInfoForTheHub() {
        assertThat(mvc.get().uri("/actuator/info"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.build.artifact")
                .isEqualTo("minha-livraria");
    }

    @Test
    void shouldApplyTheMigrations() {
        Integer profiles = jdbc.sql("SELECT COUNT(*) FROM profile").query(Integer.class).single();

        assertThat(profiles).isEqualTo(1);
    }

    @Test
    void shouldAnswerUnknownApiRoutesWithProblemDetailsInPortuguese() {
        assertThat(mvc.get().uri("/api/v1/nao-existe"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.title")
                .isEqualTo("Recurso não encontrado");
    }

    @Test
    void shouldKeepShutdownUnavailableWithoutToken() {
        assertThat(mvc.post().uri("/actuator/shutdown"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("resource.not-found");
    }
}
