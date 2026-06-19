package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record InvitedUserRequest(
        @NotNull(message = "O administrador é obrigatório")
        UUID adminId,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "E-mail inválido")
        String email,

        @NotBlank(message = "O nível de acesso é obrigatório")
        String accessLevel
) {}