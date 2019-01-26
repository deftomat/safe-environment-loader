# Safe environment loader

Webpack loader which replaces `process.env.<ANYTHING>` with environment value.
Missing environment values will cause a build error.

## Why?

Because you want to be sure that you provide all environment values required by your application.

## Installation

```
npm install safe-environment-loader --save-dev
```

## Usage

Add rule to your webpack config:

```js
{
  enforce: 'post',
  test: /environment\.js/,
  loader: 'safe-environment-loader',
}
```

Create `environment.js`:

```js
export default {
  buildId: process.env.BUILD_ID,
  stage: process.env.STAGE
};
```

Build your application: `STAGE=e2e; BUILD_ID=123 webpack -p`.

A missing values required by `environment.js` will cause build errors.

## Loader options

You can optionally provide the filter function, default values and custom environment resolver.

- Environment resolver is the JavaScript file, which can export environment values. You can specify a filename and
  loader will try to find the first file in all parent directories starting from Webpack's context.
- Default values will be used when environment value is missing.
- Filter function works like classic `filter` function in JS. It receives variable name and value and returns false when substitution needs to be ignored.

```js
{
  enforce: 'post',
  test: /environment\.js/,
  loader: 'safe-environment-loader',
  options: {
    defaults: {
      BUILD_ID: Math.random()
    },
    filter: (name, value) => name !== 'IGNORE_ME',
    envResolver: 'env.config.js'
  }
```

**CAUTION**: `process.env.NODE_ENV` is always ignored as webpack (since v4) is replacing it by default.

## Environment resolver

A simple JavaScript file which needs to export a plain object or function.
When an exported object is a function, then loader will call it with the parsed process arguments. Also, the returned Promise will be awaited.

```js
module.exports = function({ args }) {
  return {
    API_URL: args.stage === 'prod' ? 'app.io/api' : 'localhost:3100'
  };
};
```

> 💡 Resolver file is automatically added into watched files and it is resolved each time it changes or a file specified in `loader.test` changes.

## Environment value resolution order

1. check `process.env`
2. check `envResolver` result
3. check `defaults` object
4. throws _Missing ENV variable_ error

According to this resolution order, you can **ALWAYS** override ENV value by providing it in your terminal: `STAGE=dev webpack -p`

## Advanced usage

> 💡 We strongly recommend to use `envResolver` as it is much more flexible.

The following _run_ script will load environment from `.env.<stage>` file.

```
#!/usr/bin/env bash

while read assignment; do
  export $assignment
done < $(dirname "$0")/.env.$1

shift 1
"$@"
```

For example, `./run.sh local webpack -p` will load environment form `.env.local` and then run `webpack -p`.
