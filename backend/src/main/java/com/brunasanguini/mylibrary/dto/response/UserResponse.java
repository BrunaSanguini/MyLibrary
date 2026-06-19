package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String name,
        String role,
        Integer annualGoal,
        String theme
) {}