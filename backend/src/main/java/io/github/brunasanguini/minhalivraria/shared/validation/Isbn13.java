package io.github.brunasanguini.minhalivraria.shared.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A valid ISBN-13: 13 digits whose check digit matches. Hyphens and spaces are accepted, so the user can type the
 * number as it is printed on the book. Null and blank pass, since the ISBN is optional.
 */
@Documented
@Constraint(validatedBy = Isbn13Validator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface Isbn13 {

    String message() default "{io.github.brunasanguini.minhalivraria.validation.Isbn13.message}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
