package io.github.brunasanguini.minhalivraria.shared.error;

/** An external service did not answer in time (HTTP 504). */
public non-sealed class GatewayTimeoutException extends DomainException {

    public GatewayTimeoutException(String code, Object... args) {
        super(code, args);
    }
}
