export default {
    testEnvironment: 'node',
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: [
        '**/tests/**/*.test.mjs',
        '**/?(*.)+(spec|test).mjs'
    ],
    moduleFileExtensions: [ 'mjs', 'js', 'json' ],
    collectCoverageFrom: [
        'src/**/*.mjs',
        '!src/**/*.test.mjs',
        '!src/**/*.spec.mjs'
    ],
    injectGlobals: true
}