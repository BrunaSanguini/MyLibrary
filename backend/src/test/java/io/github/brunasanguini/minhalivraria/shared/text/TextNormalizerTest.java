package io.github.brunasanguini.minhalivraria.shared.text;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class TextNormalizerTest {

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {
                "Anéis do Poder|anéis do poder|aneis do poder",
                "  ROCCO  |rocco|rocco",
                "J.  R.   R. Tolkien|j. r. r. tolkien|j. r. r. tolkien",
                "Ficção Científica|ficcao cientifica|ficcao cientifica",
                "Ação|acao|acao"
            })
    void shouldIgnoreCaseAccentsAndExtraSpaces(String text, String ignored, String expected) {
        assertThat(TextNormalizer.normalize(text)).isEqualTo(expected);
    }
}
