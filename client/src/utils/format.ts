import dayjs from "dayjs";

type DateInput = string | number | Date | null | undefined;

export function formatDateTime(
  value: DateInput,
  pattern = "YYYY-MM-DD HH:mm:ss",
): string {
  if (value == null) return "-";
  return dayjs(value).format(pattern);
}

export function formatDate(value: DateInput, pattern = "YYYY-MM-DD"): string {
  if (value == null) return "-";
  return dayjs(value).format(pattern);
}
