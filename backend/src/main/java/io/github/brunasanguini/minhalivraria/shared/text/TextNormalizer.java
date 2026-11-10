package io.github.brunasanguini.minhalivraria.shared.text;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Normalized form of names and search terms: lowercase, without accents and with single spaces. "  Anéis  do
 * PODER" becomes "aneis do poder", so "aneis" finds "Anéis" and "Rocco" never becomes two publishers.
 */
public final class TextNormalizer {

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private TextNormalizer() {}

    public static String normalize(String text) {
        String withoutMarks =
                MARKS.matcher(Normalizer.normalize(text, Normalizer.Form.NFD)).replaceAll("");
        return SPACES.matcher(withoutMarks.strip()).replaceAll(" ").toLowerCase(Locale.ROOT);
    }
}
