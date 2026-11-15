package io.github.brunasanguini.minhalivraria.shared.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** A number in half points, such as 3, 3.5 or 4: the steps of a rating in stars. Null passes. */
@Documented
@Constraint(validatedBy = HalfPointValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface HalfPoint {

    String message() default "{io.github.brunasanguini.minhalivraria.validation.HalfPoint.message}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
