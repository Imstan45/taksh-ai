export function isNumericalAnswerCorrect(response: string, answer: number, tolerance: number) {
  const value = Number(response);
  return Number.isFinite(value) && Math.abs(value - answer) <= tolerance;
}
