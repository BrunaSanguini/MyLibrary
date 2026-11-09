package io.github.brunasanguini.minhalivraria;

import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.core.annotation.AliasFor;

/**
 * {@link WebMvcTest} with what every web slice needs from this application. The local security filters are always
 * part of the slice and read {@link AppProperties}, which {@code @ConfigurationPropertiesScan} does not register in
 * slice tests.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@WebMvcTest
@EnableConfigurationProperties(AppProperties.class)
public @interface WebSliceTest {

    /** Controllers to test; all of them when empty. */
    @AliasFor(annotation = WebMvcTest.class, attribute = "controllers")
    Class<?>[] controllers() default {};

    /** Extra properties in {@code key=value} form. */
    @AliasFor(annotation = WebMvcTest.class, attribute = "properties")
    String[] properties() default {};
}
