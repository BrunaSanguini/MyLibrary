package io.github.brunasanguini.minhalivraria.shared.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class IsbnsTest {

    @ParameterizedTest
    @ValueSource(strings = {"9788595084742", "978-85-9508-474-2", "978 85 9508 474 2"})
    void shouldAcceptAValidIsbn13WithOrWithoutSeparators(String isbn) {
        assertThat(Isbns.isValid13(Isbns.compact(isbn))).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"9788595084743", "978859508474", "97885950847422", "978859508474X"})
    void shouldRefuseAnIsbn13WithTheWrongCheckDigitOrLength(String isbn) {
        assertThat(Isbns.isValid13(Isbns.compact(isbn))).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"8595084742", "85-9508-474-2", "043942089X", "043942089x"})
    void shouldAcceptAValidIsbn10IncludingTheXCheckDigit(String isbn) {
        assertThat(Isbns.isValid10(Isbns.compact(isbn))).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"8595084743", "859508474", "85950847422", "04394208X9", "859508474Y"})
    void shouldRefuseAnIsbn10WithTheWrongCheckDigitOrLength(String isbn) {
        assertThat(Isbns.isValid10(Isbns.compact(isbn))).isFalse();
    }

    @Test
    void shouldTurnNullAndBlankIntoNull() {
        assertThat(Isbns.compact(null)).isNull();
        assertThat(Isbns.compact("  -  ")).isNull();
    }

    @Test
    void shouldKeepTheCheckDigitUppercase() {
        assertThat(Isbns.compact("0-439-42089-x")).isEqualTo("043942089X");
    }
}
