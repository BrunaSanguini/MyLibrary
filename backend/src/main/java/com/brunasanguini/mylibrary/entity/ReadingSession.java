package com.brunasanguini.mylibrary.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "reading_sessions")
@Getter
@Setter
public class ReadingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;              // null enquanto ainda está lendo

    @Column(name = "reread_number", nullable = false)
    private Integer rereadNumber = 0;      // 0 = leitura original, 1+ = releituras

    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;   // true quando endDate é preenchida

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Calculado na hora — não armazenado no banco (RN-032, RN-104)
    @Transient
    public Long getDaysToRead() {
        if (startDate == null || endDate == null) return null;
        return ChronoUnit.DAYS.between(startDate, endDate);
    }
}