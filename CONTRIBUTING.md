# Contributing to Strip Photobooth

Thank you for your interest in contributing to Strip Photobooth! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git
- MongoDB Atlas account (for testing)
- Cloudinary account (for testing)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/strip-photobooth.git
   cd strip-photobooth
   ```

2. **Install Dependencies**
   ```bash
   npm run install-all
   ```

3. **Setup Environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with your backend URL
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Use meaningful variable and function names

### Commit Messages
Use conventional commit format:
```
type(scope): description

Examples:
feat(frontend): add template upload functionality
fix(backend): resolve CORS issue with image uploads
docs(readme): update installation instructions
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm test
```

### Backend Testing
```bash
cd backend
npm test
```

### Manual Testing Checklist
- [ ] Photo capture works on different devices
- [ ] Template upload and display
- [ ] Print functionality
- [ ] Admin dashboard operations
- [ ] Responsive design on mobile/tablet

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - OS and version
   - Browser and version
   - Node.js version
   - Device type (mobile/desktop)

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Error Messages**
   - Console errors
   - Network errors
   - Server logs

## 💡 Feature Requests

For new features, please:

1. Check existing issues first
2. Describe the use case
3. Explain the expected behavior
4. Consider implementation complexity
5. Discuss potential alternatives

## 🔧 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding guidelines
   - Add tests if applicable
   - Update documentation

3. **Test Thoroughly**
   - Test on multiple devices
   - Verify all existing functionality works
   - Check console for errors

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use descriptive title
   - Explain changes made
   - Reference related issues
   - Add screenshots for UI changes

### Pull Request Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated as needed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Cross-browser compatibility checked

## 📁 Project Structure

```
strip-photobooth/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── App.js          # Main app
│   │   └── index.js        # Entry point
│   └── public/             # Static assets
├── backend/                 # Node.js API
│   ├── controllers/        # Request handlers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── config/            # Configuration
│   └── utils/             # Helper functions
└── docs/                   # Documentation
```

## 🎯 Areas for Contribution

### High Priority
- [ ] Unit tests for components
- [ ] Integration tests
- [ ] Performance optimizations
- [ ] Accessibility improvements
- [ ] Mobile UX enhancements

### Medium Priority
- [ ] Additional template designs
- [ ] Export formats (PDF, etc.)
- [ ] Social media sharing
- [ ] Analytics dashboard
- [ ] Multi-language support

### Low Priority
- [ ] Theme customization
- [ ] Advanced photo filters
- [ ] Video recording
- [ ] Cloud storage options
- [ ] API documentation

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the code of conduct
- Ask questions when unsure

## 📞 Getting Help

- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Questions**: Tag maintainers in issues

## 🏆 Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Invited to maintainer discussions

Thank you for contributing to Strip Photobooth! 🎉
