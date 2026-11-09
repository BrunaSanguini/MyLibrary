package io.github.brunasanguini.minhalivraria.shared.error;

/** The request conflicts with the current state, such as a duplicated ISBN (HTTP 409). */
public non-sealed class ConflictException extends DomainException {

    public ConflictException(String code, Object... args) {
        super(code, args);
    }
}
