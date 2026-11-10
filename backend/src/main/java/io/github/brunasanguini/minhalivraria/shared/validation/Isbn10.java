package io.github.brunasanguini.minhalivraria.shared.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A valid ISBN-10: 9 digits plus a check digit from 0 to 9 or X. Hyphens, spaces and a lowercase x are accepted.
 * Null and blank pass, since the ISBN is optional.
 */
@Documented
@Constraint(validatedBy = Isbn10Validator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface Isbn10 {

    String message() default "{io.github.brunasanguini.minhalivraria.validation.Isbn10.message}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
