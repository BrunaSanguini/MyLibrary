package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.TagRequest;
import com.brunasanguini.mylibrary.dto.response.TagResponse;
import com.brunasanguini.mylibrary.entity.Tag;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.TagRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    public List<TagResponse> findAll() {
        return tagRepository.findAll().stream().map(this::toResponse).toList();
    }

    public TagResponse findById(UUID id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag não encontrada"));
        return toResponse(tag);
    }

    public TagResponse create(TagRequest request) {
        Tag tag = new Tag();
        tag.setName(request.name());
        return toResponse(tagRepository.save(tag));
    }

    public TagResponse update(UUID id, TagRequest request) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag não encontrada"));
        tag.setName(request.name());
        return toResponse(tagRepository.save(tag));
    }

    public void delete(UUID id) {
        tagRepository.deleteById(id);
    }

    private TagResponse toResponse(Tag tag) {
        return new TagResponse(tag.getId(), tag.getName());
    }
}