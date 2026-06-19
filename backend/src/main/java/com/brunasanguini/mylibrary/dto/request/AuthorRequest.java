package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AuthorRequest(

        @NotBlank(message = "O nome do autor é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name,

        @Size(max = 5000, message = "A biografia deve ter no máximo 5000 caracteres")
        String bio,

        LocalDate birthDate
) {}