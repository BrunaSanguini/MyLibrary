package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.SeriesRequest;
import com.brunasanguini.mylibrary.dto.response.SeriesResponse;
import com.brunasanguini.mylibrary.entity.Series;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.SeriesRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SeriesService {

    private final SeriesRepository seriesRepository;
    private final BookRepository bookRepository;

    public SeriesService(SeriesRepository seriesRepository, BookRepository bookRepository) {
        this.seriesRepository = seriesRepository;
        this.bookRepository = bookRepository;
    }

    public List<SeriesResponse> findAll() {
        return seriesRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public SeriesResponse findById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    public SeriesResponse create(SeriesRequest request) {
        Series series = new Series();
        series.setName(request.name());
        series.setTotalVolumes(request.totalVolumes());
        return toResponse(seriesRepository.save(series));
    }

    public SeriesResponse update(UUID id, SeriesRequest request) {
        Series series = findOrThrow(id);
        series.setName(request.name());
        series.setTotalVolumes(request.totalVolumes());
        return toResponse(seriesRepository.save(series));
    }

    public void delete(UUID id) {
        if (bookRepository.existsBySeriesId(id)) {
            throw new IllegalStateException("Não é possível excluir uma série com livros associados");
        }
        seriesRepository.deleteById(id);
    }

    private Series findOrThrow(UUID id) {
        return seriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Série não encontrada"));
    }

    private SeriesResponse toResponse(Series series) {
        return new SeriesResponse(
                series.getId(),
                series.getName(),
                series.getTotalVolumes()
        );
    }
}