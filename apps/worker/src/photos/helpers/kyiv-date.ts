// The calendar day in Kyiv ("YYYY-MM-DD"), not the server's (UTC) day. Same rule as the API's date-only helper.
const KYIV_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Kyiv',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function kyivDate(at: Date): string {
  return KYIV_DATE.format(at);
}
