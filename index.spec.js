const loader = require('./index').bind({
  cacheable: jest.fn(),
  query: {
    defaults: {
      CUSTOM_VAR: 'default-value'
    },
    filter: (name, value) => name !== 'IGNORE_NAME' && value !== 'ignore-me'
  }
});

afterEach(() => {
  delete process.env.VAR1;
  delete process.env.VAR2;
  delete process.env.VAR3;
  delete process.env.VAR4;
  delete process.env.VAR5;
  delete process.env.VAR6;
  delete process.env.VAR7;
});

describe('A source processing', () => {
  const source = `
  const var1 = process.env.VAR1;
  const var2 = process.env.VAR2;
  // const var3 = process.env.VAR3;
  const var4 = process.env.VAR4;
  /*
    const var5 = process.env.VAR5;
    const var6 = process.env.VAR6;
  */
  const var7 = process.env.VAR7;`;

  const expected = `
  const var1 = "abc1";
  const var2 = "abc2";
  // const var3 = process.env.VAR3;
  const var4 = "abc4";
  /*
    const var5 = process.env.VAR5;
    const var6 = process.env.VAR6;
  */
  const var7 = "abc7";`;

  it('should fail when ENV variable is missing.', () => {
    process.env.VAR1 = 'abc1';
    process.env.VAR2 = 'abc2';
    process.env.VAR4 = 'abc4';

    expect(() => loader(source)).toThrowError('Environment variable "VAR7" is missing!');
  });

  it('should replace placeholders with their values', () => {
    process.env.VAR1 = 'abc1';
    process.env.VAR2 = 'abc2';
    process.env.VAR4 = 'abc4';
    process.env.VAR7 = 'abc7';

    expect(loader(source)).toBe(expected);
  });
});

it('Should convert "undefined" string to undefined value', () => {
  process.env.VAR1 = 'undefined';
  expect(loader('process.env.VAR1')).toBe('undefined');
});

it('Should convert "null" string to null value', () => {
  process.env.VAR1 = 'null';
  expect(loader('process.env.VAR1')).toBe('null');
});

it('Should convert number string to number', () => {
  process.env.VAR1 = '1.23';
  expect(loader('process.env.VAR1')).toBe('1.23');
});

it('Should fail when value is an empty string', () => {
  process.env.VAR1 = '';
  expect(() => loader('process.env.VAR1')).toThrowError('Environment variable "VAR1" is missing!');
});

it('Should use a default value when it is missing in ENV', () => {
  expect(loader('process.env.CUSTOM_VAR')).toBe('"default-value"');
});

it('Should ignore default value when a value is in ENV', () => {
  process.env.CUSTOM_VAR = 'abc';
  expect(loader('process.env.CUSTOM_VAR')).toBe('"abc"');
});

it('Should ignore variable based on ignore function (name)', () => {
  process.env.IGNORE_NAME = 'abc';
  expect(loader('process.env.IGNORE_NAME')).toBe('process.env.IGNORE_NAME');
});

it('Should ignore variable based on ignore function (value)', () => {
  process.env.VAR1 = 'ignore-me';
  expect(loader('process.env.VAR1')).toBe('process.env.VAR1');
});
