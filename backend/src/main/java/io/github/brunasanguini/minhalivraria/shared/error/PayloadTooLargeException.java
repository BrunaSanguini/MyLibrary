package io.github.brunasanguini.minhalivraria.shared.error;

/** The uploaded content is bigger than allowed (HTTP 413). */
public non-sealed class PayloadTooLargeException extends DomainException {

    public PayloadTooLargeException(String code, Object... args) {
        super(code, args);
    }
}
