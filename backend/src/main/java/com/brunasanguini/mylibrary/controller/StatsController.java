package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.response.StatsResponse;
import com.brunasanguini.mylibrary.entity.User;
import com.brunasanguini.mylibrary.service.StatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    // GET /api/stats
    @GetMapping
    public ResponseEntity<StatsResponse> getStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(statsService.getStats(user.getId()));
    }
}