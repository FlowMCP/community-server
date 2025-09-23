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
    coverageThreshold: {
        global: {
            statements: 25,
            branches: 18,
            functions: 20,
            lines: 25
        }
    },
    coverageReporters: [ 'text', 'lcov', 'html' ],
    injectGlobals: true,
    silent: true,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.mjs']
}