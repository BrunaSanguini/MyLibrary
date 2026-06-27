package com.brunasanguini.mylibrary.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "books")
@Getter
@Setter
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ── Dados bibliográficos ─────────────────────────────────────────────

    @Column(nullable = false)
    private String title;

    @Column(unique = true)
    private String isbn;                    // RN-010: ISBN único

    @Column(name = "page_count")
    private Integer pageCount;             // RN-018: inteiro positivo

    private String language;               // RN-016: obrigatório, validado no DTO

    @Column(columnDefinition = "TEXT")
    private String synopsis;

    @Column(name = "cover_url")
    private String coverUrl;               // RN-019: URL da capa (Open Library ou upload)

    @Column(name = "publication_year")
    private Integer publicationYear;

    // ── Relacionamentos ──────────────────────────────────────────────────

    @ManyToMany                            // RN-012
    @JoinTable(
            name = "book_authors",
            joinColumns = @JoinColumn(name = "book_id"),
            inverseJoinColumns = @JoinColumn(name = "author_id")
    )
    private Set<Author> authors = new HashSet<>();

    @ManyToMany                            // RN-013
    @JoinTable(
            name = "book_genres",
            joinColumns = @JoinColumn(name = "book_id"),
            inverseJoinColumns = @JoinColumn(name = "genre_id")
    )
    private Set<Genre> genres = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisher_id")
    private Publisher publisher;

    // ── Série ────────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)     // RN-020
    @JoinColumn(name = "series_id")
    private Series series;

    @Column(name = "volume_number")
    private Integer volumeNumber;          // RN-021

    // ── Tags ─────────────────────────────────────────────────────────────

    @ElementCollection                     // RN-080: strings simples, sem entidade
    @CollectionTable(
            name = "book_tags",
            joinColumns = @JoinColumn(name = "book_id")
    )
    @Column(name = "tag")
    private Set<String> tags = new HashSet<>();

    // ── Status de leitura ────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "reading_status", nullable = false)
    private ReadingStatus readingStatus = ReadingStatus.WANT_TO_READ;  // RN-030/RN-031

    @Column(name = "reread_count")
    private Integer rereadCount = 0;       // RN-033: contador de releituras

    // ── Avaliação qualitativa ────────────────────────────────────────────

    @Column(name = "would_reread")
    private Boolean wouldReread;           // RN-050

    @Column(name = "would_recommend")
    private Boolean wouldRecommend;        // RN-050

    @Column(name = "is_favorite")
    private Boolean isFavorite;            // RN-050

    @Column(columnDefinition = "TEXT")
    private String review;                 // RN-051: resenha pessoal

    // ── Metadados ────────────────────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}