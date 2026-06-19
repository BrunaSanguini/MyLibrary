package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.RatingDimension;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RatingDimensionRepository extends JpaRepository<RatingDimension, UUID> {
}
