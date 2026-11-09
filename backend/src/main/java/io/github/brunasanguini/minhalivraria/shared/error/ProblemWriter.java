package io.github.brunasanguini.minhalivraria.shared.error;

import io.github.brunasanguini.minhalivraria.shared.config.AppLocale;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes Problem Details from servlet filters, which run before Spring MVC and its exception handling. The body has
 * the same fields as {@link ApiExceptionHandler} produces.
 */
public final class ProblemWriter {

    private static final Object[] NO_ARGS = {};

    private final ProblemFactory problems;
    private final JsonMapper json;

    public ProblemWriter(MessageSource messages, JsonMapper json) {
        this.problems = new ProblemFactory(messages);
        this.json = json;
    }

    public void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String code)
            throws IOException {
        ProblemDetail problem = problems.create(status, code, NO_ARGS, request.getRequestURI(), AppLocale.DEFAULT);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", String.valueOf(problem.getType()));
        body.put("title", String.valueOf(problem.getTitle()));
        body.put("status", problem.getStatus());
        body.put("detail", String.valueOf(problem.getDetail()));
        body.put("instance", String.valueOf(problem.getInstance()));
        body.put("code", code);

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        json.writeValue(response.getOutputStream(), body);
    }
}
