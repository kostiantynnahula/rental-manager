import { parseConditionExpectations } from './parse-condition-expectations.js';

describe('parseConditionExpectations', () => {
  it('keeps the entries, items trimmed and blanks dropped', () => {
    expect(
      parseConditionExpectations([{ file: 'kitchen.jpg', items: [' мийка ', '', '  ', 'кран'] }]),
    ).toEqual([{ file: 'kitchen.jpg', items: ['мийка', 'кран'] }]);
  });

  it('rejects a top level that is not an array', () => {
    expect(() => parseConditionExpectations({ file: 'a.jpg', items: [] })).toThrow(
      'expected.json must be an array',
    );
  });

  it('names the entry with a bad file or items', () => {
    expect(() => parseConditionExpectations([{ items: [] }])).toThrow('expected.json[0]: "file"');
    expect(() => parseConditionExpectations([null])).toThrow('expected.json[0]: "file"');
    expect(() => parseConditionExpectations([{ file: 'a.jpg' }])).toThrow(
      'expected.json[0] (a.jpg): "items"',
    );
    expect(() => parseConditionExpectations([{ file: 'a.jpg', items: [1] }])).toThrow(
      'expected.json[0] (a.jpg): "items"',
    );
  });
});
