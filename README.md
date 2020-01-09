# Safe environment loader

Webpack loader which replaces `process.env.<ANYTHING>` with environment value.
Missing environment values will cause the build error.

## Why?

Because you want to be sure that you provide all environment values required by your application.

## Installation

```
npm install safe-environment-loader --save-dev
```

## Usage

Add rule into your webpack config:

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

Any missing values required by `environment.js` will cause build error.

## Loader options

Optionally, you can provide the custom environment resolver and filter function.

Environment resolver is a function, which will return the following object or a promise, which resolves into that object:

```ts
{
  interface ResolverOutput {
    values?: Record<string, any>;
    error?: Error;
    files?: string[];
  }
}
```

Filter function works like classic `filter` function in JS. It receives variable name and value and returns false when substitution needs to be ignored.

```js
{
  enforce: 'post',
  test: /environment\.js/,
  loader: 'safe-environment-loader',
  options: {
    filter: (name, value) => name !== 'IGNORE_ME',
    envResolver: () => ({
      values: {
        BUILD_ID: Math.random(),
      }
    })
  }
```

**CAUTION**: `process.env.NODE_ENV` is always ignored as webpack (since v4) is replacing it by default.

## Advanced environment resolver

Environment resolver can implement any complex logic, for example, you can create JS file, which is able to generate ENV values on demand and share it between multiple build processes.

Unfortunately, any changes in that file will be ignored until you restart the Webpack.

To fix that, you can return additional `files` property to let Webpack know, which files needs to be watched and if any of them change, `envResolver` will be evaluated again.

```js
// env.config.js

const stage = process.argv[2];

module.exports = () => ({
  API_URL: stage === 'prod' ? 'app.io/api' : 'localhost:3100'
});
```

```js
// webpack.config.js

{
  enforce: 'post',
  test: /environment\.js/,
  loader: 'safe-environment-loader',
  options: {
    envResolver: () => {
      const resolverFile = require.resolve(`./env.config.js`);
      delete require.cache[resolverFile];
      const config = require(resolverFile)

      try {
        return { values: config(), files: [resolverFile]}
      } catch (error) {
        // We want to recover from any error on next change in `env.config.js`.
        // So, we need to pass `files` even when config evaluation fails.
        return { error, files: [resolverFile] }
      }
    }
  }
```

With this configuration, Webpack will watch `env.config.js` for any changes
and re-evaluate it when `env.config.js` or `environment.js` file change.

## Environment value resolution order

1. check `process.env`
2. check `envResolver` result
3. throws _Missing ENV variable_ error

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
