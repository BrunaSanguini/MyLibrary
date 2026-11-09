package io.github.brunasanguini.minhalivraria.shared.error;

import java.net.URI;
import java.util.Locale;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

/**
 * Builds RFC 9457 Problem Details with the conventions of docs/erros.md: a stable {@code code}, a {@code type} that
 * links to the catalog and Portuguese title and detail from messages.properties.
 */
public final class ProblemFactory {

    private static final String CATALOG = "https://github.com/BrunaSanguini/MyLibrary/blob/main/docs/erros.md#";

    private final MessageSource messages;

    public ProblemFactory(MessageSource messages) {
        this.messages = messages;
    }

    public ProblemDetail create(HttpStatusCode status, String code, Object[] args, String instance, Locale locale) {
        String title = message("problem." + code + ".title", null, code, locale);
        String detail = message("problem." + code + ".detail", args, title, locale);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(type(code));
        problem.setTitle(title);
        problem.setInstance(URI.create(instance));
        problem.setProperty("code", code);
        return problem;
    }

    /** The catalog anchor is the code with dots replaced by hyphens. */
    public static URI type(String code) {
        return URI.create(CATALOG + code.replace('.', '-'));
    }

    private String message(String key, Object @Nullable [] args, String fallback, Locale locale) {
        return Objects.requireNonNullElse(messages.getMessage(key, args, fallback, locale), fallback);
    }
}
