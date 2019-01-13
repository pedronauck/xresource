module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupTestFrameworkScriptFile: './rtl.setup.js',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
}
