package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record InvitedUserResponse(
        UUID id,
        UUID adminId,
        String email,
        String accessLevel
) {}