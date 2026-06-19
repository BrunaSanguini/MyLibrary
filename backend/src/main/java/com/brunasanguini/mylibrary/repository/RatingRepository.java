package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RatingRepository extends JpaRepository<Rating, UUID> {
}
