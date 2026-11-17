import { connect } from './test/mcp-client.js';

// Every tool: listed, read-only, with an output schema and the inputs it requires.
const TOOLS: [name: string, required: string[] | undefined][] = [
  ['list_apartments', undefined],
  ['get_apartment', ['apartmentId']],
  ['get_month_readings', ['apartmentId', 'period']],
  ['get_reading_history', ['apartmentId']],
  ['get_tariffs', ['apartmentId']],
  ['list_statements', ['apartmentId']],
  ['get_statement', ['statementId']],
  ['preview_statement', ['apartmentId', 'period']],
];

describe('createServer', () => {
  it('registers exactly these tools', async () => {
    const { client } = await connect({});
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(TOOLS.map(([name]) => name).sort());
  });

  it.each(TOOLS)(
    '%s is read-only, described, with input and output schemas',
    async (name, required) => {
      const { client } = await connect({});
      const tool = (await client.listTools()).tools.find((t) => t.name === name);
      expect(tool?.annotations?.readOnlyHint).toBe(true);
      expect(tool?.description).toMatch(/read-only|nothing is saved/i);
      expect(tool?.inputSchema.required).toEqual(required);
      expect(tool?.outputSchema?.type).toBe('object');
    },
  );
});
