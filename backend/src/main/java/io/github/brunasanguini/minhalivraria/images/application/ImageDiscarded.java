package io.github.brunasanguini.minhalivraria.images.application;

import io.github.brunasanguini.minhalivraria.images.ImageKind;

/** An image row was deleted; its file goes to the trash once the transaction commits. */
record ImageDiscarded(ImageKind kind, String fileName) {}
