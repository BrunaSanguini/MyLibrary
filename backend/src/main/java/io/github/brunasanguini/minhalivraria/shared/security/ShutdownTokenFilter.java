package io.github.brunasanguini.minhalivraria.shared.security;

import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import io.github.brunasanguini.minhalivraria.shared.error.ProblemWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.jspecify.annotations.Nullable;
import org.springframework.context.MessageSource;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

/**
 * Protects {@code /actuator/shutdown}: only the My Collection hub, which started the app with a per-session token,
 * may shut it down (ADR-0001). Without a configured token the endpoint does not exist.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
class ShutdownTokenFilter extends OncePerRequestFilter {

    static final String HEADER = "X-MyCollection-Token";
    private static final String SHUTDOWN_PATH = "/actuator/shutdown";

    private final AppProperties properties;
    private final ProblemWriter problems;

    ShutdownTokenFilter(AppProperties properties, MessageSource messages, JsonMapper json) {
        this.properties = properties;
        this.problems = new ProblemWriter(messages, json);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !SHUTDOWN_PATH.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = properties.shutdownToken();
        if (token == null || token.isBlank()) {
            problems.write(request, response, HttpStatus.NOT_FOUND, "resource.not-found");
            return;
        }
        if (matches(request.getHeader(HEADER), token)) {
            chain.doFilter(request, response);
            return;
        }
        problems.write(request, response, HttpStatus.FORBIDDEN, "request.invalid-token");
    }

    /** Constant-time comparison, so the response time does not reveal how much of the token was right. */
    private static boolean matches(@Nullable String provided, String expected) {
        if (provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                provided.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8));
    }
}
