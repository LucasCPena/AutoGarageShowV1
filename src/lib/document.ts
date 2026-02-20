const REPEATED_DIGITS_REGEX = /^(\d)\1+$/;

export function onlyDigits(value: string | undefined | null) {
  return (value || "").replace(/\D+/g, "");
}

export function validateCPF(value: string | undefined | null) {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (REPEATED_DIGITS_REGEX.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

export function validateCNPJ(value: string | undefined | null) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (REPEATED_DIGITS_REGEX.test(digits)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((acc, digit, index) => acc + Number(digit) * factors[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstDigit !== Number(digits[12])) return false;

  const secondDigit = calcDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return secondDigit === Number(digits[13]);
}

export function validateBrazilianDocument(value: string | undefined | null) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return validateCPF(digits);
  if (digits.length === 14) return validateCNPJ(digits);
  return false;
}

