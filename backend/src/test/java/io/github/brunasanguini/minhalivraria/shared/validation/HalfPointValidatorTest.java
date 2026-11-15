package io.github.brunasanguini.minhalivraria.shared.validation;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintValidatorContext;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;

class HalfPointValidatorTest {

    private final HalfPointValidator validator = new HalfPointValidator();
    private final ConstraintValidatorContext context = Mockito.mock(ConstraintValidatorContext.class);

    @ParameterizedTest
    @ValueSource(strings = {"1", "1.0", "1.5", "3.50", "4", "5.0", "0.5", "10"})
    void shouldAcceptWholeAndHalfPoints(String value) {
        assertThat(validator.isValid(new BigDecimal(value), context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"3.3", "4.25", "4.75", "1.05", "2.9"})
    void shouldRefuseAnythingBetweenTheHalfPoints(String value) {
        assertThat(validator.isValid(new BigDecimal(value), context)).isFalse();
    }

    @Test
    void shouldLetAnAbsentValuePass() {
        assertThat(validator.isValid(null, context)).isTrue();
    }
}
