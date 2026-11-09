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
 * Answers only requests addressed to the local machine by name. A page on another site can point its own domain to
 * 127.0.0.1 (DNS rebinding); its requests carry that domain in the {@code Host} header and are refused here.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class LocalHostFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_HOSTS = Set.of("localhost", "127.0.0.1");

    private final ProblemWriter problems;

    LocalHostFilter(MessageSource messages, JsonMapper json) {
        this.problems = new ProblemWriter(messages, json);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (ALLOWED_HOSTS.contains(request.getServerName())) {
            chain.doFilter(request, response);
            return;
        }
        problems.write(request, response, HttpStatus.FORBIDDEN, "request.invalid-host");
    }
}
