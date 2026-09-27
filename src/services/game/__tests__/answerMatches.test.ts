import { describe, expect, it } from 'vitest';
import { answerMatches, FRACTION_NOTE, ROUNDING_NOTE, withAnswerFormat } from '../curriculum';

describe('answerMatches', () => {
  it('fraction math stays exact: equivalent fractions and exact decimals count, rounding and truncation do not', () => {
    const prompt = withAnswerFormat('What is P(blue)?', 2 / 7);
    expect(prompt).toContain(FRACTION_NOTE);
    for (const ok of ['2/7', '4/14', ' 6 / 21 ']) expect(answerMatches(ok, 2 / 7, prompt)).toBe(true);
    for (const bad of ['0.29', '0.28', '0.286', '0.3']) expect(answerMatches(bad, 2 / 7, prompt)).toBe(false);
    expect(answerMatches('0.625', 0.625, withAnswerFormat('x', 0.625))).toBe(true);
    expect(answerMatches('5/8', 0.625)).toBe(true);
    expect(answerMatches('0.63', 0.625)).toBe(false);
    expect(answerMatches('-4/3', -4 / 3)).toBe(true);
  });
  it('rounding counts only when the question asks for a decimal, and must be real rounding', () => {
    const prompt = withAnswerFormat('A fair coin is flipped 5 times. What is P(exactly 1 head), as a decimal?', 5 / 32);
    expect(prompt).toContain(ROUNDING_NOTE);
    for (const ok of ['0.16', '0.156', '0.15625', '5/32']) expect(answerMatches(ok, 5 / 32, prompt)).toBe(true);
    for (const bad of ['0.15', '0.2', '0.1']) expect(answerMatches(bad, 5 / 32, prompt)).toBe(false);
  });
  it('short answers are unchanged', () => {
    expect(answerMatches('0.5', 0.5)).toBe(true);
    expect(answerMatches('1/2', 0.5)).toBe(true);
    expect(answerMatches('0.51', 0.5)).toBe(false);
    expect(answerMatches('12', 12)).toBe(true);
    expect(answerMatches(12, 12)).toBe(true);
    expect(answerMatches('abc', 1)).toBe(false);
    expect(withAnswerFormat('3 + 4', 7)).toBe('3 + 4');
    expect(withAnswerFormat('0.1 + 0.2', 0.1 + 0.2)).toBe('0.1 + 0.2');
    expect(withAnswerFormat(withAnswerFormat('x', 1 / 3), 1 / 3).split(FRACTION_NOTE)).toHaveLength(2);
  });
});
