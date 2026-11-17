package io.github.brunasanguini.minhalivraria.openlibrary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import io.github.brunasanguini.minhalivraria.openlibrary.client.OpenLibraryApi;
import io.github.brunasanguini.minhalivraria.openlibrary.client.OpenLibraryGateway;
import io.github.brunasanguini.minhalivraria.openlibrary.client.RateLimiter;
import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import io.github.brunasanguini.minhalivraria.shared.error.BadGatewayException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.unit.DataSize;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

/** Conversion of real Open Library answers, recorded in src/test/resources/openlibrary (see its README). */
class OpenLibraryClientTest {

    private static final String API = "https://openlibrary.org";
    private static final String COVERS = "https://covers.openlibrary.org";

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server =
            MockRestServiceServer.bindTo(builder).ignoreExpectOrder(true).build();
    private final OpenLibraryClient client = new OpenLibraryClient(
            new OpenLibraryGateway(
                    HttpServiceProxyFactory.builderFor(RestClientAdapter.create(
                                    builder.clone().baseUrl(API).build()))
                            .build()
                            .createClient(OpenLibraryApi.class),
                    builder.clone().baseUrl(COVERS).build(),
                    new RateLimiter(Duration.ZERO)),
            properties());

    @Test
    void shouldReadAnEditionByIsbn() {
        expect("/isbn/9788595084742.json", "edition-OL29823759M.json");
        expect("/authors/OL26320A.json", "author-OL26320A.json");

        OpenLibraryBook book = client.findByIsbn("978-85-9508-474-2");

        assertThat(book.editionKey()).isEqualTo("OL29823759M");
        assertThat(book.workKey()).isEqualTo("OL27482W");
        assertThat(book.title()).isEqualTo("O Hobbit");
        assertThat(book.subtitle()).isNull();
        assertThat(book.authors()).containsExactly(new OpenLibraryAuthor("OL26320A", "J.R.R. Tolkien"));
        assertThat(book.publishers()).containsExactly("Harper Collins");
        assertThat(book.pageCount()).isEqualTo(336);
        assertThat(book.isbn13()).isEqualTo("9788595084742");
        assertThat(book.isbn10()).isEqualTo("8595084742");
        assertThat(book.coverId()).isEqualTo(14826646L);
        server.verify();
    }

    @Test
    void shouldTurnTheLanguageKeyIntoACodeAndTheIsoDateIntoAYear() {
        expect("/books/OL29823759M.json", "edition-OL29823759M.json");
        expect("/authors/OL26320A.json", "author-OL26320A.json");

        OpenLibraryBook book = client.findEdition("OL29823759M");

        assertThat(book.languageCode()).isEqualTo("por");
        assertThat(book.publishedYear()).isEqualTo((short) 2019);
        assertThat(book.description()).startsWith("Bilbo Bolseiro era um dos mais respeitáveis hobbits");
    }

    @Test
    void shouldTurnAFreeTextDateIntoAYearAndBorrowTheDescriptionOfTheWork() {
        expect("/books/OL7604539M.json", "edition-OL7604539M.json");
        expect("/works/OL27482W.json", "work-OL27482W.json");
        expect("/authors/OL26320A.json", "author-OL26320A.json");

        OpenLibraryBook book = client.findEdition("OL7604539M");

        assertThat(book.publishedYear()).isEqualTo((short) 2021);
        assertThat(book.subtitle()).isEqualTo("or there and back again");
        assertThat(book.description()).startsWith("The Hobbit is a tale of high adventure");
        server.verify();
    }

    @Test
    void shouldReadADescriptionThatComesAsAnObjectAndBorrowTheAuthorsOfTheWork() {
        expect("/books/OL33891995M.json", "edition-OL33891995M.json");
        expect("/works/OL27482W.json", "work-OL27482W.json");
        expect("/authors/OL26320A.json", "author-OL26320A.json");

        OpenLibraryBook book = client.findEdition("OL33891995M");

        assertThat(book.description()).startsWith("Bilbo Baggins is a hobbit who enjoys a comfortable");
        assertThat(book.authors()).extracting(OpenLibraryAuthor::name).containsExactly("J.R.R. Tolkien");
        assertThat(book.isbn10()).isEqualTo("054792822X");
        server.verify();
    }

    @Test
    void shouldAnswerTheConfirmationWithWhatThePreviewFetched() {
        expect("/isbn/9788595084742.json", "edition-OL29823759M.json");
        expect("/authors/OL26320A.json", "author-OL26320A.json");

        OpenLibraryBook preview = client.findByIsbn("9788595084742");
        OpenLibraryBook confirmation = client.findEdition(preview.editionKey());

        assertThat(confirmation).isEqualTo(preview);
        server.verify();
    }

    @Test
    void shouldListTheCandidatesOfASearch() {
        server.expect(ExpectedCount.once(), requestTo(Matchers.startsWith(API + "/search.json")))
                .andExpect(queryParam("q", "Hobbit"))
                .andExpect(queryParam("limit", "20"))
                .andRespond(withSuccess(fixture("search.json"), MediaType.APPLICATION_JSON));

        List<OpenLibraryCandidate> candidates = client.search("  Hobbit ");
        List<OpenLibraryCandidate> again = client.search("hobbit");

        assertThat(candidates)
                .containsExactly(
                        new OpenLibraryCandidate(
                                "OL29823759M",
                                "OL27482W",
                                "O Hobbit",
                                List.of("J.R.R. Tolkien"),
                                (short) 2019,
                                14826646L),
                        new OpenLibraryCandidate(
                                "OL33891995M",
                                "OL27455W",
                                "The Annotated Hobbit",
                                List.of("J.R.R. Tolkien", "Douglas A. Anderson"),
                                (short) 1988,
                                null));
        assertThat(again).isEqualTo(candidates);
        server.verify();
    }

    @Test
    void shouldNotSearchForBlankText() {
        assertThat(client.search("   ")).isEmpty();
        server.verify();
    }

    @Test
    void shouldReportAMissingEditionAsNotFound() {
        server.expect(requestTo(API + "/books/OL404M.json")).andRespond(withResourceNotFound());

        assertThatThrownBy(() -> client.findEdition("OL404M"))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("openlibrary.not-found");
    }

    @Test
    void shouldReportAnErrorAnswerAsBadResponse() {
        server.expect(requestTo(API + "/books/OL500M.json")).andRespond(withServerError());

        assertThatThrownBy(() -> client.findEdition("OL500M"))
                .isInstanceOf(BadGatewayException.class)
                .extracting("code")
                .isEqualTo("openlibrary.bad-response");
    }

    @Test
    void shouldReportUnreadableDataAsBadResponse() {
        server.expect(requestTo(API + "/books/OL1M.json"))
                .andRespond(withSuccess("{ \"key\": [", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.findEdition("OL1M")).isInstanceOf(BadGatewayException.class);
    }

    @Test
    void shouldNotCallTheApiForTextThatIsNotAnIsbnOrAnEditionKey() {
        assertThatThrownBy(() -> client.findByIsbn("9788595084740")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> client.findEdition("../works/OL27482W")).isInstanceOf(NotFoundException.class);
        server.verify();
    }

    @Test
    void shouldDownloadTheLargeCoverByItsId() {
        byte[] image = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};
        server.expect(requestTo(COVERS + "/b/id/14826646-L.jpg?default=false"))
                .andRespond(withSuccess(image, MediaType.IMAGE_JPEG));

        assertThat(client.downloadCover(14826646L).orElseThrow()).isEqualTo(image);
    }

    @Test
    void shouldAnswerEmptyWhenTheOpenLibraryHasNoSuchCover() {
        server.expect(requestTo(COVERS + "/b/id/1-L.jpg?default=false")).andRespond(withResourceNotFound());

        assertThat(client.downloadCover(1L)).isEmpty();
    }

    @Test
    void shouldPointThePreviewAtTheMediumCover() {
        assertThat(client.coverUrl(14826646L)).isEqualTo(COVERS + "/b/id/14826646-M.jpg");
    }

    private void expect(String path, String fixture) {
        server.expect(ExpectedCount.once(), requestTo(API + path))
                .andRespond(withSuccess(fixture(fixture), MediaType.APPLICATION_JSON));
    }

    private static ClassPathResource fixture(String name) {
        return new ClassPathResource("openlibrary/" + name);
    }

    private static AppProperties properties() {
        return new AppProperties(
                Path.of("unused"),
                new AppProperties.OpenLibrary(
                        URI.create(API), URI.create(COVERS + "/"), null, Duration.ofSeconds(3), Duration.ofSeconds(10)),
                new AppProperties.Images(DataSize.ofMegabytes(5), Duration.ofDays(30)),
                new AppProperties.Backup(5),
                null);
    }
}
