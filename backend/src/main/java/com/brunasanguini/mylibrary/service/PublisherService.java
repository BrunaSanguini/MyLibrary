package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.PublisherRequest;
import com.brunasanguini.mylibrary.dto.response.PublisherResponse;
import com.brunasanguini.mylibrary.entity.Publisher;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.PublisherRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PublisherService {

    private final PublisherRepository publisherRepository;

    public PublisherService(PublisherRepository publisherRepository) {
        this.publisherRepository = publisherRepository;
    }

    public List<PublisherResponse> findAll() {
        return publisherRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PublisherResponse findById(UUID id) {
        Publisher publisher = publisherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Editora não encontrada"));
        return toResponse(publisher);
    }

    public PublisherResponse create(PublisherRequest request) {
        Publisher publisher = new Publisher();
        publisher.setName(request.name());
        return toResponse(publisherRepository.save(publisher));
    }

    public PublisherResponse update(UUID id, PublisherRequest request) {
        Publisher publisher = publisherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Editora não encontrada"));
        publisher.setName(request.name());
        return toResponse(publisherRepository.save(publisher));
    }

    public void delete(UUID id) {
        publisherRepository.deleteById(id);
    }

    private PublisherResponse toResponse(Publisher publisher) {
        return new PublisherResponse(publisher.getId(), publisher.getName());
    }
}