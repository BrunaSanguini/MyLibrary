package io.github.brunasanguini.minhalivraria.shared.error;

/** An external service cannot be reached, usually because there is no internet connection (HTTP 503). */
public non-sealed class ServiceUnavailableException extends DomainException {

    public ServiceUnavailableException(String code, Object... args) {
        super(code, args);
    }
}
