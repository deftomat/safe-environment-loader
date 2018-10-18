# Safe environment loader

## Installation

```
npm install safe-environment-loader --save-dev
```

## Usage

Add rule to your webpack config:

```js
{
  enforce: 'post',
  test: /environment\.ts/,
  loader: 'safe-environment-loader',
  options: {
    defaults: { BUILD_ID: 123 }
  }
}
```
