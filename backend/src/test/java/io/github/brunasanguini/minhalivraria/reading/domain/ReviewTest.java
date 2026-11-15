package io.github.brunasanguini.minhalivraria.reading.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ReviewTest {

    @Test
    void shouldAcceptOnlyARating() {
        Review review = new Review(42, new BigDecimal("4.5"), null);

        assertThat(review.rating()).isEqualByComparingTo("4.5");
        assertThat(review.content()).isNull();
    }

    @Test
    void shouldAcceptOnlyAText() {
        Review review = new Review(42, null, "  Um clássico.  ");

        assertThat(review.rating()).isNull();
        assertThat(review.content()).isEqualTo("Um clássico.");
    }

    @Test
    void shouldRefuseAReviewWithoutRatingAndWithoutText() {
        assertThatThrownBy(() -> new Review(42, null, "   "))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("review.empty");
    }

    @Test
    void shouldKeepWhatItHadWhenARewriteIsEmpty() {
        Review review = new Review(42, new BigDecimal("3.0"), "Bom.");

        assertThatThrownBy(() -> review.rewrite(null, null)).isInstanceOf(BusinessRuleException.class);

        assertThat(review.rating()).isEqualByComparingTo("3.0");
        assertThat(review.content()).isEqualTo("Bom.");
    }
}
