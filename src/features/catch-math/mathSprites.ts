const DIGITS: Record<string, string> = {
  '0': '/assets/generated/new/math-throw/digits/0.png',
  '1': '/assets/generated/new/math-throw/digits/1.png',
  '2': '/assets/generated/new/math-throw/digits/2.png',
  '3': '/assets/generated/new/math-throw/digits/3.png',
  '4': '/assets/generated/new/math-throw/digits/4.png',
  '5': '/assets/generated/new/math-throw/digits/5.png',
  '6': '/assets/generated/new/math-throw/digits/6.png',
  '7': '/assets/generated/new/math-throw/digits/7.png',
  '8': '/assets/generated/new/math-throw/digits/8.png',
  '9': '/assets/generated/new/math-throw/digits/9.png',
};

const OPERATORS: Record<string, string> = {
  '+': '/assets/generated/new/math-throw/operators/plus.png',
  '-': '/assets/generated/new/math-throw/operators/minus.png',
  '×': '/assets/generated/new/math-throw/operators/times.png',
  '÷': '/assets/generated/new/math-throw/operators/divide.png',
  '=': '/assets/generated/new/math-throw/operators/equals.png',
};

export function singleSprite(text: string): string | null {
  if (text.length !== 1) return null;
  return DIGITS[text] ?? OPERATORS[text] ?? null;
}

export function tokensFor(text: string): string[] | null {
  const t = text.trim();
  if (!t) return null;
  const out: string[] = [];
  for (const ch of t) {
    const s = DIGITS[ch] ?? OPERATORS[ch];
    if (!s) return null;
    out.push(s);
  }
  return out.length ? out : null;
}
