package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<Rating, UUID> {

    List<Rating> findByBookId(UUID bookId);

    Optional<Rating> findByBookIdAndDimension_Id(UUID bookId, UUID dimensionId);

    void deleteByBookId(UUID bookId);
}