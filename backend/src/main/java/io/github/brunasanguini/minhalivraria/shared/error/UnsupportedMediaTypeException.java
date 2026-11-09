package io.github.brunasanguini.minhalivraria.shared.error;

/** The uploaded content is not in an accepted format (HTTP 415). */
public non-sealed class UnsupportedMediaTypeException extends DomainException {

    public UnsupportedMediaTypeException(String code, Object... args) {
        super(code, args);
    }
}
