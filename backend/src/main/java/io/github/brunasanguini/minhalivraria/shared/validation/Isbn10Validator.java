package io.github.brunasanguini.minhalivraria.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.jspecify.annotations.Nullable;

class Isbn10Validator implements ConstraintValidator<Isbn10, String> {

    @Override
    public boolean isValid(@Nullable String value, ConstraintValidatorContext context) {
        String compact = Isbns.compact(value);
        return compact == null || Isbns.isValid10(compact);
    }
}
