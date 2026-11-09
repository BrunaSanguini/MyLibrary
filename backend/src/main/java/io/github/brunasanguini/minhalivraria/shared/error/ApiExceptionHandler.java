package io.github.brunasanguini.minhalivraria.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Turns every error into Problem Details with a stable {@code code} (ADR-0004, docs/erros.md). */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final Object[] NO_ARGS = {};

    private final ProblemFactory problems;

    ApiExceptionHandler(MessageSource messages) {
        this.problems = new ProblemFactory(messages);
    }

    @ExceptionHandler(DomainException.class)
    ResponseEntity<Object> handleDomain(DomainException exception, WebRequest request) {
        HttpStatus status = switch (exception) {
            case NotFoundException ignored -> HttpStatus.NOT_FOUND;
            case ConflictException ignored -> HttpStatus.CONFLICT;
            case BusinessRuleException ignored -> HttpStatus.UNPROCESSABLE_CONTENT;
        };
        ProblemDetail problem = problem(status, exception.code(), exception.args(), request);
        return ResponseEntity.status(status).body(problem);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> handleUnexpected(Exception exception, WebRequest request) {
        log.error("Unexpected error on {}", path(request), exception);
        ProblemDetail problem = problem(HttpStatus.INTERNAL_SERVER_ERROR, "internal.error", NO_ARGS, request);
        return ResponseEntity.internalServerError().body(problem);
    }

    /** Framework errors (validation, malformed JSON, missing route...) get the same format as business errors. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception,
            @Nullable Object body,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        ProblemDetail problem = problem(status, frameworkCode(exception, status), NO_ARGS, request);
        if (exception instanceof MethodArgumentNotValidException invalid) {
            problem.setProperty("errors", fieldErrors(invalid));
        }
        return ResponseEntity.status(status).headers(headers).body(problem);
    }

    private ProblemDetail problem(HttpStatusCode status, String code, Object[] args, WebRequest request) {
        return problems.create(status, code, args, path(request), LocaleContextHolder.getLocale());
    }

    private static String frameworkCode(Exception exception, HttpStatusCode status) {
        if (exception instanceof MethodArgumentNotValidException
                || exception instanceof HandlerMethodValidationException) {
            return "validation";
        }
        return switch (status.value()) {
            case 400 -> "request.malformed";
            case 404 -> "resource.not-found";
            case 405 -> "request.method-not-allowed";
            case 415 -> "request.unsupported-media-type";
            default -> status.is5xxServerError() ? "internal.error" : "request.invalid";
        };
    }

    private static List<FieldViolation> fieldErrors(MethodArgumentNotValidException exception) {
        return exception.getBindingResult().getFieldErrors().stream()
                .map(error ->
                        new FieldViolation(error.getField(), Objects.requireNonNullElse(error.getDefaultMessage(), "")))
                .toList();
    }

    private static String path(WebRequest request) {
        if (request instanceof NativeWebRequest nativeRequest
                && nativeRequest.getNativeRequest() instanceof HttpServletRequest servletRequest) {
            return servletRequest.getRequestURI();
        }
        return "/";
    }

    /** One entry of the {@code errors} list of a validation problem. */
    record FieldViolation(String field, String message) {}
}
