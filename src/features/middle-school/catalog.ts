// Stable additions: legacy g6/g7/g8-s0..s5 retain their original meanings.
export const MIDDLE_TOPICS = {
  6: ['Fraction division', 'Decimal operations', 'Expressions and equations', 'Coordinate plane', 'Area and volume', 'Statistics'],
  7: ['Rational arithmetic', 'Proportional relationships', 'Multi-step equations', 'Scale and geometry', 'Probability', 'Sampling and statistics'],
  8: ['Exponents and roots', 'Linear functions', 'Systems of equations', 'Transformations', 'Volume', 'Data and models'],
} as const;
const names = {
  6: ['Divide by a unit fraction', 'Divide two fractions', 'Interpret fractional servings', 'Add decimal quantities', 'Multiply decimal quantities', 'Divide decimal quantities', 'Evaluate a variable expression', 'Use the distributive property', 'Solve a one-step equation', 'Find horizontal coordinate distance', 'Find vertical coordinate distance', 'Interpret absolute value', 'Find triangle area', 'Find rectangular prism volume', 'Find rectangular prism surface area', 'Find the mean of a data set', 'Find the median of a data set', 'Find the range of a data set'],
  7: ['Add signed fractions', 'Multiply signed fractions', 'Divide signed rational numbers', 'Find a proportional constant from a table', 'Use a proportional equation', 'Compare unit prices', 'Solve a two-step equation', 'Solve an equation with parentheses', 'Find an integer inequality boundary', 'Use a scale drawing', 'Find circle area', 'Find a missing triangle angle', 'Find a simple probability', 'Find an independent compound probability', 'Use experimental probability', 'Estimate a population count from a random sample', 'Compare two means', 'Find mean absolute deviation'],
  8: ['Use the product rule for exponents', 'Evaluate a negative exponent', 'Locate a square root between integers', 'Find slope from two points', 'Evaluate a linear function', 'Find a linear function intercept', 'Solve a system by elimination', 'Solve a system by substitution', 'Find the intersection input of two lines', 'Translate a coordinate', 'Reflect across the y-axis', 'Dilate a coordinate from the origin', 'Find cylinder volume', 'Find cone volume', 'Find sphere volume', 'Predict using a linear model', 'Find a model residual', 'Calculate a conditional relative frequency'],
} as const;
const references = {
  6: ['6.NS.A.1', '6.NS.B.3', '6.EE.A–B', '6.NS.C', '6.G.A', '6.SP.B'],
  7: ['7.NS.A', '7.RP.A', '7.EE.B', '7.G.A–B', '7.SP.C', '7.SP.A–B'],
  8: ['8.EE.A / 8.NS.A', '8.F.A–B', '8.EE.C.8', '8.G.A', '8.G.C.9', '8.SP.A'],
} as const;
export const isMiddleGrade = (grade: number): grade is 6 | 7 | 8 => grade === 6 || grade === 7 || grade === 8;
export function middleSkills(grade: number) {
  if (!isMiddleGrade(grade)) return [];
  return names[grade].map((name, i) => ({ id: `g${grade}-s${i + 6}`, grade, variant: i + 6, name,
    topic: MIDDLE_TOPICS[grade][Math.floor(i / 3)], reference: references[grade][Math.floor(i / 3)] }));
}
export const middleSkill = (id: string) => [6, 7, 8].flatMap(middleSkills).find(s => s.id === id);
