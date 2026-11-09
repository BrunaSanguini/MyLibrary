package io.github.brunasanguini.minhalivraria.shared.security;

import io.github.brunasanguini.minhalivraria.shared.error.ProblemWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.context.MessageSource;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

/**
 * Requires a custom header on every API request that changes data. Browsers only send custom headers cross-site after
 * a CORS preflight, which this app never allows, so another site cannot change the library through the browser.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
class RequestedByFilter extends OncePerRequestFilter {

    static final String HEADER = "X-Requested-By";
    static final String EXPECTED_VALUE = "minha-livraria";

    private static final Set<String> UNSAFE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final ProblemWriter problems;

    RequestedByFilter(MessageSource messages, JsonMapper json) {
        this.problems = new ProblemWriter(messages, json);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/") || !UNSAFE_METHODS.contains(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (EXPECTED_VALUE.equals(request.getHeader(HEADER))) {
            chain.doFilter(request, response);
            return;
        }
        problems.write(request, response, HttpStatus.FORBIDDEN, "request.missing-header");
    }
}
