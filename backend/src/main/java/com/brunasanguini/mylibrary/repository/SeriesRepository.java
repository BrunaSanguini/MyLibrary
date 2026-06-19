package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Series;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SeriesRepository extends JpaRepository<Series, UUID> {
}
