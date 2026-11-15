package io.github.brunasanguini.minhalivraria.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.math.BigDecimal;
import org.jspecify.annotations.Nullable;

class HalfPointValidator implements ConstraintValidator<HalfPoint, BigDecimal> {

    private static final BigDecimal TWO = BigDecimal.valueOf(2);

    @Override
    public boolean isValid(@Nullable BigDecimal value, ConstraintValidatorContext context) {
        // Twice a half-point number is whole.
        return value == null || value.multiply(TWO).stripTrailingZeros().scale() <= 0;
    }
}
