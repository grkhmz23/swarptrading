/** CSS `url()` value with the URL quoted; quotes, backslashes and newlines are stripped so it cannot break out. */
export function cssUrl(value: string): string {
  return `url("${value.replace(/["\\\n\r]/g, "")}")`;
}
