package com.brunasanguini.mylibrary.dto.response;

public record AuthResponse(
        String token,
        String name,
        String email,
        String role
) {}