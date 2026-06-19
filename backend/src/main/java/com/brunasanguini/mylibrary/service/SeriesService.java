package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.SeriesRequest;
import com.brunasanguini.mylibrary.dto.response.SeriesResponse;
import com.brunasanguini.mylibrary.entity.Series;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.SeriesRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SeriesService {

    private final SeriesRepository seriesRepository;

    public SeriesService(SeriesRepository seriesRepository) {
        this.seriesRepository = seriesRepository;
    }

    public List<SeriesResponse> findAll() {
        return seriesRepository.findAll().stream().map(this::toResponse).toList();
    }

    public SeriesResponse findById(UUID id) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Série não encontrada"));
        return toResponse(series);
    }

    public SeriesResponse create(SeriesRequest request) {
        Series series = new Series();
        series.setName(request.name());
        series.setTotalVolumes(request.totalVolumes());
        return toResponse(seriesRepository.save(series));
    }

    public SeriesResponse update(UUID id, SeriesRequest request) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Série não encontrada"));
        series.setName(request.name());
        series.setTotalVolumes(request.totalVolumes());
        return toResponse(seriesRepository.save(series));
    }

    public void delete(UUID id) {
        seriesRepository.deleteById(id);
    }

    private SeriesResponse toResponse(Series series) {
        return new SeriesResponse(series.getId(), series.getName(), series.getTotalVolumes());
    }
}