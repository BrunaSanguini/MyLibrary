package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Genre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GenreRepository extends JpaRepository<Genre, UUID> {
}
