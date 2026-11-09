package io.github.brunasanguini.minhalivraria.shared.error;

/** The request is well formed but breaks a business rule (HTTP 422). */
public non-sealed class BusinessRuleException extends DomainException {

    public BusinessRuleException(String code, Object... args) {
        super(code, args);
    }
}
