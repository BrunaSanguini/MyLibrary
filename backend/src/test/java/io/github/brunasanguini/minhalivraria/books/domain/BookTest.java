package io.github.brunasanguini.minhalivraria.books.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class BookTest {

    @Test
    void shouldNormalizeTitleAndSubtitleIntoTheSearchText() {
        Book book = new Book(fields("  A Sociedade do Anel  ", "O Senhor dos Anéis"));

        assertThat(book.title()).isEqualTo("A Sociedade do Anel");
        assertThat(book.searchText()).isEqualTo("a sociedade do anel o senhor dos aneis");
    }

    @Test
    void shouldRecalculateTheSearchTextOnEveryUpdate() {
        Book book = new Book(fields("Duna", null));

        book.update(fields("O Messias de Duna", null));

        assertThat(book.searchText()).isEqualTo("o messias de duna");
    }

    @Test
    void shouldTurnABlankSubtitleIntoNull() {
        Book book = new Book(fields("Duna", "   "));

        assertThat(book.subtitle()).isNull();
        assertThat(book.searchText()).isEqualTo("duna");
    }

    @Test
    void shouldKeepOnlyTheDigitsOfTheIsbns() {
        BookFields fields = new BookFields(
                "Duna", null, "978-85-9508-474-2", "0-439-42089-x", null, null, null, null, Ownership.NONE, false);

        Book book = new Book(fields);

        assertThat(book.isbn13()).isEqualTo("9788595084742");
        assertThat(book.isbn10()).isEqualTo("043942089X");
    }

    @Test
    void shouldAcceptSeriesAndPositionTogether() {
        Book book = new Book(fields("A Sociedade do Anel", null));

        book.assignSeries(new Series("O Senhor dos Anéis", 3), new BigDecimal("1.0"));

        assertThat(book.seriesPosition()).isEqualByComparingTo("1.0");
    }

    @Test
    void shouldRefuseASeriesWithoutPosition() {
        Book book = new Book(fields("A Sociedade do Anel", null));

        assertThatThrownBy(() -> book.assignSeries(new Series("O Senhor dos Anéis", 3), null))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("book.series-position-required");
    }

    @Test
    void shouldRefuseAPositionWithoutSeries() {
        Book book = new Book(fields("A Sociedade do Anel", null));

        assertThatThrownBy(() -> book.assignSeries(null, new BigDecimal("1.0")))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void shouldClearSeriesAndPositionTogether() {
        Book book = new Book(fields("A Sociedade do Anel", null));
        book.assignSeries(new Series("O Senhor dos Anéis", 3), new BigDecimal("1.0"));

        book.leaveSeries();

        assertThat(book.series()).isNull();
        assertThat(book.seriesPosition()).isNull();
    }

    @Test
    void shouldReturnThePreviousImageWhenTheCoverIsReplaced() {
        Book book = new Book(fields("Duna", null));

        assertThat(book.replaceCover(17L)).isNull();
        assertThat(book.replaceCover(18L)).isEqualTo(17L);
        assertThat(book.coverImageId()).isEqualTo(18L);
        assertThat(book.replaceCover(null)).isEqualTo(18L);
    }

    @Test
    void shouldNotDiscardTheImageWhenTheBannerDoesNotChange() {
        Book book = new Book(fields("Duna", null));
        book.replaceBanner(42L);

        assertThat(book.replaceBanner(42L)).isNull();
        assertThat(book.bannerImageId()).isEqualTo(42L);
    }

    @Test
    void shouldBuildTheOpenLibraryKeys() {
        Book book = new Book(fields("Duna", null));

        book.linkToOpenLibrary("OL27448W", "OL51694024M");

        assertThat(book.olWorkKey()).isEqualTo("OL27448W");
        assertThat(book.olEditionKey()).isEqualTo("OL51694024M");
    }

    private static BookFields fields(String title, String subtitle) {
        return new BookFields(title, subtitle, null, null, null, null, null, null, Ownership.NONE, false);
    }
}
