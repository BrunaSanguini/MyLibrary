package io.github.brunasanguini.minhalivraria;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import java.io.UnsupportedEncodingException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Without internet the import answers 503 and nothing else stops working. The test profile points the Open Library
 * at an address where nothing listens, which is what being offline looks like to the application.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BookImportOfflineIT {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";

    @Autowired
    private MockMvcTester mvc;

    @Test
    void shouldAnswer503WhenThereIsNoConnection() {
        assertThat(mvc.get().uri("/api/v1/books/import/search?q=hobbit"))
                .hasStatus(HttpStatus.SERVICE_UNAVAILABLE)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("openlibrary.unavailable");
    }

    @Test
    void shouldKeepRegisteringBooksByHandWhenThereIsNoConnection() throws UnsupportedEncodingException {
        assertThat(mvc.get().uri("/api/v1/books/import/preview?isbn=9788595084742"))
                .hasStatus(HttpStatus.SERVICE_UNAVAILABLE);

        MvcTestResult author = mvc.post()
                .uri("/api/v1/authors")
                .header(REQUESTED_BY, MINHA_LIVRARIA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "name": "J. R. R. Tolkien" }
                        """)
                .exchange();
        assertThat(author).hasStatus(HttpStatus.CREATED);
        Number authorId = JsonPath.read(author.getResponse().getContentAsString(), "$.id");

        assertThat(mvc.post()
                        .uri("/api/v1/books")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "O Hobbit", "authorIds": [%d] }
                                """.formatted(authorId.longValue())))
                .hasStatus(HttpStatus.CREATED);
    }
}
