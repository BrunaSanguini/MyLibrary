package io.github.brunasanguini.minhalivraria.shared.error;

/**
 * Base of every business error. The {@code code} is stable, is documented in docs/erros.md and decides the message
 * shown to the user (messages.properties) and the behavior of the front-end.
 *
 * <p>The hierarchy is sealed so the HTTP status mapping in {@link ApiExceptionHandler} is checked by the compiler.
 */
public abstract sealed class DomainException extends RuntimeException
        permits BadRequestException,
                NotFoundException,
                ConflictException,
                BusinessRuleException,
                PayloadTooLargeException,
                UnsupportedMediaTypeException {

    private final String code;
    private final transient Object[] args;

    protected DomainException(String code, Object... args) {
        super(code);
        this.code = code;
        this.args = args.clone();
    }

    public String code() {
        return code;
    }

    /** Values interpolated into the message, such as the duplicated ISBN. */
    public Object[] args() {
        return args.clone();
    }
}
