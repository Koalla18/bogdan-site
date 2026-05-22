const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateInput(dateInput: string): Date {
  if (!DATE_INPUT_REGEX.test(dateInput)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }

  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toShortDateLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${day}.${month}`;
}
