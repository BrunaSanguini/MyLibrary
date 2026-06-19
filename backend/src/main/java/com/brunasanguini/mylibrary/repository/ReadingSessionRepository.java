package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.ReadingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReadingSessionRepository extends JpaRepository<ReadingSession, UUID> {
}
