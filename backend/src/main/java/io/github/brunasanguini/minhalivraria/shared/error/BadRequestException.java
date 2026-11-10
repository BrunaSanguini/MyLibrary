package io.github.brunasanguini.minhalivraria.shared.error;

/** A request the application understood but cannot accept as sent, such as an unknown sort field (HTTP 400). */
public non-sealed class BadRequestException extends DomainException {

    public BadRequestException(String code, Object... args) {
        super(code, args);
    }
}
