package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record GenreResponse(UUID id, String name, UUID parentId) {}