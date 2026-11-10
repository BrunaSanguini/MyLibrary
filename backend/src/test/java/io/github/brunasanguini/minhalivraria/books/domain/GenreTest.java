package io.github.brunasanguini.minhalivraria.books.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import org.junit.jupiter.api.Test;

class GenreTest {

    @Test
    void shouldCreateASubgenreInsideAGenre() {
        Genre fantasy = new Genre("Fantasia", null);

        Genre highFantasy = new Genre("Alta fantasia", fantasy);

        assertThat(fantasy.isSubgenre()).isFalse();
        assertThat(highFantasy.isSubgenre()).isTrue();
        assertThat(highFantasy.parent()).isSameAs(fantasy);
    }

    @Test
    void shouldRefuseAThirdLevel() {
        Genre highFantasy = new Genre("Alta fantasia", new Genre("Fantasia", null));

        assertThatThrownBy(() -> new Genre("Fantasia épica", highFantasy))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("genre.invalid-parent");
    }

    @Test
    void shouldRefuseItselfAsParent() {
        Genre fantasy = new Genre("Fantasia", null);

        assertThatThrownBy(() -> fantasy.changeParent(fantasy)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void shouldKeepTheNormalizedNameInSync() {
        Genre genre = new Genre("  Ficção   Científica ", null);
        assertThat(genre.name()).isEqualTo("Ficção   Científica");
        assertThat(genre.normalizedName()).isEqualTo("ficcao cientifica");

        genre.rename("Horror");

        assertThat(genre.normalizedName()).isEqualTo("horror");
    }
}
