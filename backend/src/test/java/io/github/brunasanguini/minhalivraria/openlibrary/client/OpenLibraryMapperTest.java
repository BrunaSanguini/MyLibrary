package io.github.brunasanguini.minhalivraria.openlibrary.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.BadGatewayException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class OpenLibraryMapperTest {

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {
                "1954 | 1954",
                "July 29, 1954 | 1954",
                "2019-07-15 | 2019",
                "1 Deccember 2021 | 2021",
                "c1937 | 1937",
                "[1966?] | 1966",
                "Outubro de 2001. | 2001"
            })
    void shouldFindTheYearInAFreeTextDate(String publishDate, short year) {
        assertThat(OpenLibraryMapper.year(publishDate)).isEqualTo(year);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "n.d.", "19--", "9788595084742", "0000"})
    void shouldLeaveTheYearEmptyWhenTheDateHasNone(String publishDate) {
        assertThat(OpenLibraryMapper.year(publishDate)).isNull();
    }

    @Test
    void shouldReadADescriptionGivenAsPlainText() {
        assertThat(OpenLibraryMapper.text("  Numa toca no chão vivia um hobbit.  "))
                .isEqualTo("Numa toca no chão vivia um hobbit.");
    }

    @Test
    void shouldReadADescriptionGivenAsAnObject() {
        Object description = Map.of("type", "/type/text", "value", "Numa toca no chão vivia um hobbit.");

        assertThat(OpenLibraryMapper.text(description)).isEqualTo("Numa toca no chão vivia um hobbit.");
    }

    @Test
    void shouldIgnoreADescriptionInAnUnknownShape() {
        assertThat(OpenLibraryMapper.text(List.of("texto"))).isNull();
        assertThat(OpenLibraryMapper.text(Map.of("type", "/type/text"))).isNull();
        assertThat(OpenLibraryMapper.text("   ")).isNull();
        assertThat(OpenLibraryMapper.text(null)).isNull();
    }

    @Test
    void shouldTurnALanguageKeyIntoItsCode() {
        assertThat(OpenLibraryMapper.languageCode(List.of(new KeyReference("/languages/por"))))
                .isEqualTo("por");
    }

    @Test
    void shouldSkipLanguagesThatAreNotThreeLetterCodes() {
        List<KeyReference> languages = List.of(
                new KeyReference(null), new KeyReference("/languages/pt-BR"), new KeyReference("/languages/eng"));

        assertThat(OpenLibraryMapper.languageCode(languages)).isEqualTo("eng");
        assertThat(OpenLibraryMapper.languageCode(null)).isNull();
    }

    @Test
    void shouldKeepOnlyValidIsbnsAndCovers() {
        EditionResponse edition = edition(
                "/books/OL1M",
                "Duna",
                List.of("978-85-9508-474-0", "978-85-9508-474-2"),
                List.of("123", "8595084742"),
                Arrays.asList(null, -1L, 14826646L));

        var book = OpenLibraryMapper.toBook(edition, null, List.of());

        assertThat(book.isbn13()).isEqualTo("9788595084742");
        assertThat(book.isbn10()).isEqualTo("8595084742");
        assertThat(book.coverId()).isEqualTo(14826646L);
    }

    @Test
    void shouldRefuseAnEditionWithoutTitle() {
        EditionResponse edition = edition("/books/OL1M", "  ", null, null, null);

        assertThatThrownBy(() -> OpenLibraryMapper.toBook(edition, null, List.of()))
                .isInstanceOf(BadGatewayException.class)
                .extracting("code")
                .isEqualTo("openlibrary.bad-response");
    }

    @Test
    void shouldRefuseAnEditionWithoutKey() {
        EditionResponse edition = edition(null, "Duna", null, null, null);

        assertThatThrownBy(() -> OpenLibraryMapper.toBook(edition, null, List.of()))
                .isInstanceOf(BadGatewayException.class);
    }

    @Test
    void shouldUseThePersonalNameWhenTheAuthorHasNoName() {
        assertThat(OpenLibraryMapper.nameOf(new AuthorResponse("/authors/OL1A", null, "Frank Herbert")))
                .isEqualTo("Frank Herbert");
        assertThat(OpenLibraryMapper.nameOf(new AuthorResponse("/authors/OL1A", " ", null)))
                .isNull();
    }

    private static EditionResponse edition(
            String key, String title, List<String> isbn13, List<String> isbn10, List<Long> covers) {
        return new EditionResponse(key, title, null, null, null, null, null, null, isbn13, isbn10, null, null, covers);
    }
}
