package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.RatingDimension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RatingDimensionRepository extends JpaRepository<RatingDimension, UUID> {
    List<RatingDimension> findByIsUniversalTrue();
    List<RatingDimension> findByGenreId(UUID genreId);
}