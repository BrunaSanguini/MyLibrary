package io.github.brunasanguini.minhalivraria.shared.error;

/** The requested resource does not exist (HTTP 404). */
public non-sealed class NotFoundException extends DomainException {

    public NotFoundException(String code, Object... args) {
        super(code, args);
    }
}
