package io.github.brunasanguini.minhalivraria.shared.validation;

import java.util.Locale;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** Check digits of the two ISBN formats (ISO 2108). */
public final class Isbns {

    private static final Pattern SEPARATORS = Pattern.compile("[\\s-]");

    private Isbns() {}

    /** The number without hyphens or spaces, with a lowercase x turned into X. Null stays null. */
    public static @Nullable String compact(@Nullable String isbn) {
        if (isbn == null) {
            return null;
        }
        String compact = SEPARATORS.matcher(isbn).replaceAll("").toUpperCase(Locale.ROOT);
        return compact.isEmpty() ? null : compact;
    }

    /** 13 digits whose weighted sum (1, 3, 1, 3...) is a multiple of 10. */
    public static boolean isValid13(String compact) {
        if (compact.length() != 13 || !compact.chars().allMatch(Character::isDigit)) {
            return false;
        }
        int sum = 0;
        for (int position = 0; position < 13; position++) {
            int digit = Character.digit(compact.charAt(position), 10);
            sum += position % 2 == 0 ? digit : digit * 3;
        }
        return sum % 10 == 0;
    }

    /** 9 digits plus a check digit (0-9 or X) whose weighted sum (10, 9, 8...) is a multiple of 11. */
    public static boolean isValid10(String compact) {
        if (compact.length() != 10) {
            return false;
        }
        int sum = 0;
        for (int position = 0; position < 9; position++) {
            char character = compact.charAt(position);
            if (!Character.isDigit(character)) {
                return false;
            }
            sum += (10 - position) * Character.digit(character, 10);
        }
        char check = compact.charAt(9);
        int checkValue;
        if (check == 'X') {
            checkValue = 10;
        } else if (Character.isDigit(check)) {
            checkValue = Character.digit(check, 10);
        } else {
            return false;
        }
        return (sum + checkValue) % 11 == 0;
    }
}
