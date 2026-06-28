package com.brunasanguini.mylibrary.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(
        name = "book_ratings",
        uniqueConstraints = @UniqueConstraint(columnNames = {"book_id", "dimension_id"})
)
@Getter
@Setter
public class BookRating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    // RN-044: valor decimal entre 0 e 10
    @Column(nullable = false)
    private Double score;
}