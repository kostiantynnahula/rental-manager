import type { PhotoParseStatus } from '@/lib/api/queries/photos';

// Card badge per parse status; PARSED shows none (the photo's drafts speak for themselves).
export const PARSE_STATUS_BADGES: Partial<Record<PhotoParseStatus, string>> = {
  PENDING: 'Розпізнається…',
  NOT_MATCHED: 'Не розпізнано',
  FAILED: 'Помилка розпізнавання',
};

// The line under the date on the photo screen.
export const PARSE_STATUS_LINES: Record<PhotoParseStatus, string> = {
  PENDING: 'Розпізнається… Форма оновиться, щойно буде результат',
  PARSED: 'Розпізнано: показання підставлено у форму нижче',
  NOT_MATCHED: 'Не розпізнано — внесіть показання вручну',
  FAILED: 'Помилка розпізнавання — внесіть показання вручну',
};
