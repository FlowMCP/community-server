// Jest setup file to suppress console output during tests
// This keeps console statements in source modules but hides them during test execution

// Store original console methods
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
}

// Mock console methods to suppress output during tests
global.console = {
    ...console,
    log: () => {},
    warn: () => {},
    info: () => {},
    // Keep error output for actual test failures
    error: originalConsole.error
}

// Restore console after tests if needed
global.restoreConsole = () => {
    global.console = originalConsole
}