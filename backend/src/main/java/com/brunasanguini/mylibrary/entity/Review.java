package com.brunasanguini.mylibrary.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reviews")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "book_id", unique = true)
    private Book book;

    @Column(columnDefinition = "text")
    private String content;

    @Column(name = "would_reread")
    private Boolean wouldReread;

    @Column(name = "would_recommend")
    private Boolean wouldRecommend;

    @Column(name = "is_favorite")
    private Boolean isFavorite;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}