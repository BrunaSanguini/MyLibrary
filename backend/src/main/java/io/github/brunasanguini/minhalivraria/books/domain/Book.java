package io.github.brunasanguini.minhalivraria.books.domain;

import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import io.github.brunasanguini.minhalivraria.images.domain.Image;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import org.jspecify.nullness.NullMarked;

@Entity
@NullMarked
public class Book extends AuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 500)
  private String title;

  @Column(length = 500)
  private String subtitle;

  @Column(length = 13, unique = true)
  private String isbn13;

  @Column(length = 10)
  private String isbn10;

  private Integer pageCount;
  
  private Short publishedYear;
  
  @Column(length = 3)
  private String languageCode;
  
  @Column(length = 10000)  
  private String synopsis;

  @Enumerated(EnumType.STRING)
  @Column(length = 10)
  private Ownership ownership = Ownership.NONE;

  private boolean favorite;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "publisher_id")
  private Publisher publisher;

  @ManyToOne(fetch = FetchType.LAZY) 
  @JoinColumn(name = "series_id")
  private Series series;

  @Column(precision = 4, scale = 1)
  private BigDecimal seriesPosition;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "cover_image_id") 
  private Image coverImage;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "banner_image_id")
  private Image bannerImage;  

  @Column(length = 32)
  private String olWorkKey;

  @Column(length = 32, unique = true)
  private String olEditionKey;

  @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
  private List<Author> authors;

  @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
  private List<Genre> genres;

  public Long id() {
    return Objects.requireNonNull(id);
  }

  // getters, setters, equals, hashCode
}
