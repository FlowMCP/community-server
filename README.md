# 6-community-server

Community MCP Server with comprehensive test coverage

[![Test](https://github.com/flowmcp/community-server/actions/workflows/test-on-release.yml/badge.svg)](https://github.com/flowmcp/community-server/actions/workflows/test-on-release.yml)
[![codecov](https://codecov.io/gh/flowmcp/community-server/branch/main/graph/badge.svg)](https://codecov.io/gh/flowmcp/community-server)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/flowmcp/community-server.git
cd community-server

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage:src

# Start development server
npm run dev
```

## 🧪 Testing

This project maintains comprehensive test coverage with **100% test success rate**.

### Test Commands
- `npm test` - Run all tests
- `npm run test:coverage:src` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode

### Test Structure
- **Integration Tests**: End-to-end server functionality
- **Unit Tests**: Individual component testing  
- **Mock Tests**: Isolated testing with controlled dependencies
- **Coverage Tests**: Comprehensive code path coverage



## 🏗️ Architecture

### Core Components
- **ServerManager**: Main orchestration and configuration management
- **CommunityServer**: HTTP server and routing logic
- **WebhookServer**: GitHub webhook handling and deployment automation

### Key Features
- ✅ **100% Test Success Rate** - All 186 tests passing
- ✅ **High Coverage** - Comprehensive code coverage reporting
- ✅ **GitHub Integration** - Automated CI/CD with GitHub Actions
- ✅ **Security First** - No hardcoded credentials, proper environment handling
- ✅ **Mock-based Testing** - Stable, fast test execution

## 📁 Project Structure

```
src/
├── index.mjs           # Main ServerManager class
├── task/
│   ├── CommunityServer.mjs   # HTTP server implementation
│   └── WebhookServer.mjs     # Webhook handling
└── public/            # Static HTML templates

tests/
├── ServerManager.*.test.mjs     # ServerManager test suite
├── CommunityServer.*.test.mjs   # CommunityServer test suite
├── WebhookServer.*.test.mjs     # WebhookServer test suite
└── helpers/           # Test utilities and helpers
```

## 🔧 Development

### Environment Setup
1. Copy example environment files:
   ```bash
   cp tests/.test.env.example tests/.test.env
   cp tests/.community.env.example tests/.community.env
   ```

2. Update environment variables as needed
3. Ensure all secrets are externalized (never commit real credentials)

### Adding Tests
- Follow existing naming conventions: `ComponentName.testType.test.mjs`
- Use mock-based testing for reliability
- Maintain 80%+ coverage for new components
- All tests must pass before merging

## 📊 Current Stats

- **Version**: 0.7.2
- **Node.js**: 22.x 
- **Test Suites**: 15 suites
- **Total Tests**: 186 tests
- **Success Rate**: 100%
- **Last Updated**: 2025-08-25

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

ISC - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with comprehensive testing using Jest
- GitHub Actions for CI/CD automation
- Codecov for coverage reporting
- Mock-based testing for reliability and speed

---

*This README is automatically updated on each push to main branch*
