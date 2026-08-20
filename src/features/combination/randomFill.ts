export function fillCombinationRandomly(
  selectedNumbers: readonly number[],
  excludedNumbers: readonly number[] = [],
  random: () => number = Math.random,
) {
  const selected = [...new Set(selectedNumbers)].filter((number) => number >= 1 && number <= 45);
  const excluded = new Set(
    excludedNumbers.filter((number) => number >= 1 && number <= 45),
  );
  if (selected.length >= 6) return selected.slice(0, 6).sort((a, b) => a - b);
  const available = Array.from({ length: 45 }, (_, index) => index + 1)
    .filter((number) => !selected.includes(number) && !excluded.has(number));
  while (selected.length < 6 && available.length > 0) {
    const index = Math.min(available.length - 1, Math.floor(random() * available.length));
    selected.push(available.splice(index, 1)[0]);
  }
  return selected.sort((a, b) => a - b);
}
