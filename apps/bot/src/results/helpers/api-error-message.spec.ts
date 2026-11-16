import { apiErrorMessage } from './api-error-message.js';

describe('apiErrorMessage', () => {
  it('returns a string message', () => {
    expect(apiErrorMessage({ statusCode: 409, message: 'Already confirmed' })).toBe(
      'Already confirmed',
    );
  });

  it('joins a list of validation messages', () => {
    expect(apiErrorMessage({ statusCode: 400, message: ['a is required', 'b is invalid'] })).toBe(
      'a is required; b is invalid',
    );
  });

  it.each([
    ['a body without a message', { statusCode: 500 }],
    ['null', null],
    ['undefined', undefined],
    ['a string body', 'Bad Gateway'],
  ])('returns an empty string for %s', (_, error) => {
    expect(apiErrorMessage(error)).toBe('');
  });
});
