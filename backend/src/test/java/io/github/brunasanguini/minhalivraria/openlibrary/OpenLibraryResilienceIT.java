package io.github.brunasanguini.minhalivraria.openlibrary;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.matching;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.temporaryRedirect;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.assertj.core.api.Assertions.assertThat;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.github.tomakehurst.wiremock.http.Fault;
import com.github.tomakehurst.wiremock.stubbing.Scenario;
import com.github.tomakehurst.wiremock.stubbing.ServeEvent;
import io.github.brunasanguini.minhalivraria.openlibrary.client.OpenLibraryGateway;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * The whole path, from the import endpoints to a simulated Open Library: retries, rate limit and the conversion of
 * its failures into the errors of docs/erros.md. The test profile waits at most 400 ms for an answer.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OpenLibraryResilienceIT {

    private static final WireMockServer OPEN_LIBRARY =
            new WireMockServer(WireMockConfiguration.options().dynamicPort());

    private static final String PREVIEW = "/api/v1/books/import/preview?editionKey=";
    private static final String EDITION = "/books/OL29823759M.json";
    private static final String AUTHOR = "/authors/OL26320A.json";
    private static final int ATTEMPTS = 3;

    static {
        OPEN_LIBRARY.start();
    }

    @DynamicPropertySource
    static void openLibrary(DynamicPropertyRegistry registry) {
        registry.add("app.open-library.base-url", OPEN_LIBRARY::baseUrl);
        registry.add("app.open-library.covers-url", OPEN_LIBRARY::baseUrl);
        registry.add("app.open-library.contact", () -> "tests@example.invalid");
    }

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OpenLibraryClient client;

    @Autowired
    private OpenLibraryGateway gateway;

    @AfterAll
    static void stopOpenLibrary() {
        OPEN_LIBRARY.stop();
    }

    @BeforeEach
    void startClean() {
        OPEN_LIBRARY.resetAll();
        client.forgetEverything();
    }

    @Test
    void shouldAnswer504AfterTryingThreeTimesWhenTheOpenLibraryIsTooSlow() {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(EDITION)).willReturn(okJson("{}").withFixedDelay(2_000)));

        assertThat(mvc.get().uri(PREVIEW + "OL29823759M"))
                .hasStatus(HttpStatus.GATEWAY_TIMEOUT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("openlibrary.timeout");
        OPEN_LIBRARY.verify(ATTEMPTS, getRequestedFor(urlPathEqualTo(EDITION)));
    }

    @Test
    void shouldAnswer502AfterTryingThreeTimesWhenTheErrorPersists() {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(EDITION)).willReturn(aResponse().withStatus(500)));

        assertThat(mvc.get().uri(PREVIEW + "OL29823759M"))
                .hasStatus(HttpStatus.BAD_GATEWAY)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("openlibrary.bad-response");
        OPEN_LIBRARY.verify(ATTEMPTS, getRequestedFor(urlPathEqualTo(EDITION)));
    }

    @Test
    void shouldAnswer503WithoutTryingAgainWhenTheConnectionFails() {
        OPEN_LIBRARY.stubFor(
                get(urlPathEqualTo(EDITION)).willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

        assertThat(mvc.get().uri(PREVIEW + "OL29823759M"))
                .hasStatus(HttpStatus.SERVICE_UNAVAILABLE)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("openlibrary.unavailable");
    }

    @Test
    void shouldAnswer404WithoutTryingAgainWhenTheEditionDoesNotExist() {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo("/books/OL404M.json"))
                .willReturn(aResponse().withStatus(404)));

        assertThat(mvc.get().uri(PREVIEW + "OL404M"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("openlibrary.not-found");
        OPEN_LIBRARY.verify(1, getRequestedFor(urlPathEqualTo("/books/OL404M.json")));
    }

    @Test
    void shouldRecoverWhenAnErrorIsTemporary() throws IOException {
        failOnceThenAnswer(EDITION, 503, fixture("edition-OL29823759M.json"));
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(AUTHOR)).willReturn(okJson(fixture("author-OL26320A.json"))));

        assertThat(mvc.get().uri(PREVIEW + "OL29823759M"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.title")
                .isEqualTo("O Hobbit");
        OPEN_LIBRARY.verify(2, getRequestedFor(urlPathEqualTo(EDITION)));
    }

    @Test
    void shouldTryAgainWhenToldItIsCallingTooOften() throws IOException {
        failOnceThenAnswer(EDITION, 429, fixture("edition-OL29823759M.json"));
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(AUTHOR)).willReturn(okJson(fixture("author-OL26320A.json"))));

        assertThat(mvc.get().uri(PREVIEW + "OL29823759M")).hasStatusOk();
        OPEN_LIBRARY.verify(2, getRequestedFor(urlPathEqualTo(EDITION)));
    }

    @Test
    void shouldFollowTheRedirectOfAnIsbnLookup() throws IOException {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo("/isbn/9788595084742.json")).willReturn(temporaryRedirect(EDITION)));
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(EDITION)).willReturn(okJson(fixture("edition-OL29823759M.json"))));
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(AUTHOR)).willReturn(okJson(fixture("author-OL26320A.json"))));

        assertThat(mvc.get().uri("/api/v1/books/import/preview?isbn=9788595084742"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.editionKey")
                .isEqualTo("OL29823759M");
    }

    @Test
    void shouldIdentifyItselfWithTheProjectAndTheContact() throws IOException {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(AUTHOR)).willReturn(okJson(fixture("author-OL26320A.json"))));

        gateway.findAuthor("OL26320A");

        OPEN_LIBRARY.verify(getRequestedFor(urlPathEqualTo(AUTHOR))
                .withHeader(
                        "User-Agent",
                        matching("MinhaLivraria/\\S+ \\(\\+https://github\\.com/BrunaSanguini/MyLibrary;"
                                + " tests@example\\.invalid\\)")));
    }

    @Test
    void shouldKeepToThreeRequestsPerSecond() throws IOException {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(AUTHOR)).willReturn(okJson(fixture("author-OL26320A.json"))));

        for (int call = 0; call < 4; call++) {
            gateway.findAuthor("OL26320A");
        }

        List<Long> arrivals = OPEN_LIBRARY.getAllServeEvents().stream()
                .map(ServeEvent::getRequest)
                .map(request -> request.getLoggedDate().getTime())
                .sorted()
                .toList();
        assertThat(arrivals).hasSize(4);
        // Three intervals of a third of a second, with a tolerance for the clock of the simulated server.
        assertThat(arrivals.getLast() - arrivals.getFirst()).isGreaterThanOrEqualTo(900);
    }

    private static void failOnceThenAnswer(String path, int failure, String body) {
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(path))
                .inScenario(path)
                .whenScenarioStateIs(Scenario.STARTED)
                .willReturn(aResponse().withStatus(failure))
                .willSetStateTo("recovered"));
        OPEN_LIBRARY.stubFor(get(urlPathEqualTo(path))
                .inScenario(path)
                .whenScenarioStateIs("recovered")
                .willReturn(okJson(body)));
    }

    private static String fixture(String name) throws IOException {
        return new ClassPathResource("openlibrary/" + name).getContentAsString(StandardCharsets.UTF_8);
    }
}
