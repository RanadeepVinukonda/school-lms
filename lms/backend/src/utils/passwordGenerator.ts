import { randomBytes } from "crypto";

/**
 * Character pools used to build and validate generated passwords.
 */
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SPECIAL = "@$!%*?&";
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

/**
 * Picks a random character from `pool` using a cryptographically-secure
 * random byte. Rejection-sampling avoids modulo bias.
 */
function pickRandom(pool: string): string {
  const maxUsable = 256 - (256 % pool.length);
  let byte: number;
  do {
    byte = randomBytes(1)[0]!;
  } while (byte >= maxUsable);
  return pool[byte % pool.length]!;
}

/**
 * Fisher-Yates shuffle using crypto.randomBytes so the order is unpredictable.
 */
function shuffle(chars: string[]): string[] {
  const arr = [...chars];
  for (let i = arr.length - 1; i > 0; i--) {
    const maxUsable = 256 - (256 % (i + 1));
    let byte: number;
    do {
      byte = randomBytes(1)[0]!;
    } while (byte >= maxUsable);
    const j = byte % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Generates a cryptographically-random password that satisfies Requirement 4.3:
 *   - Minimum 12 characters
 *   - At least 1 uppercase letter
 *   - At least 1 lowercase letter
 *   - At least 1 digit
 *   - At least 1 special character from the allowed set (@$!%*?&)
 *
 * Strategy:
 *   1. Guarantee each required character class by injecting one representative.
 *   2. Fill remaining positions from the full character pool.
 *   3. Shuffle so mandatory characters are not at predictable positions.
 */
export function generatePassword(): string {
  const TARGET_LENGTH = 12;

  // One character guaranteed from each required class
  const mandatoryChars: string[] = [
    pickRandom(UPPERCASE),
    pickRandom(LOWERCASE),
    pickRandom(DIGITS),
    pickRandom(SPECIAL),
  ];

  // Fill remaining slots from ALL_CHARS
  const remaining: string[] = [];
  const remainingCount = TARGET_LENGTH - mandatoryChars.length;
  for (let i = 0; i < remainingCount; i++) {
    remaining.push(pickRandom(ALL_CHARS));
  }

  // Shuffle so mandatory chars land at random positions
  const passwordChars = shuffle([...mandatoryChars, ...remaining]);
  return passwordChars.join("");
}
