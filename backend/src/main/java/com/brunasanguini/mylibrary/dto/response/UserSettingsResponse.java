package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record UserSettingsResponse(
        UUID id,
        Integer annualGoal
) {}