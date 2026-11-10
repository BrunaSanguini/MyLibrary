package io.github.brunasanguini.minhalivraria.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.jspecify.annotations.Nullable;

class Isbn13Validator implements ConstraintValidator<Isbn13, String> {

    @Override
    public boolean isValid(@Nullable String value, ConstraintValidatorContext context) {
        String compact = Isbns.compact(value);
        return compact == null || Isbns.isValid13(compact);
    }
}
