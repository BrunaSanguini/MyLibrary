package io.github.brunasanguini.minhalivraria.shared.error;

/** An external service answered with an error or with data the application cannot read (HTTP 502). */
public non-sealed class BadGatewayException extends DomainException {

    public BadGatewayException(String code, Object... args) {
        super(code, args);
    }
}
