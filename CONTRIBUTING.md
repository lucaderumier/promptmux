# Contributing to PromptMux

Thank you for your interest in contributing to PromptMux! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please be kind and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Search [GitHub Issues](https://github.com/lucaderumier/promptmux/issues) to see if the bug has been reported
2. **Create a new issue** - If not found, open a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Node version)
   - Screenshots if applicable

### Suggesting Features

1. **Check existing discussions** - Look for similar feature requests
2. **Open a discussion** - Describe the feature and its use case
3. **Be specific** - Explain why this would benefit users

### Submitting Code

#### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/lucaderumier/promptmux.git
   cd promptmux
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Set up your environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

#### Development Workflow

1. **Make your changes** - Write clean, documented code
2. **Test locally** - Run `pnpm dev` and verify your changes
3. **Type check** - Run `pnpm check` to ensure no TypeScript errors
4. **Lint** - Run `pnpm lint` to check code style
5. **Commit** - Write clear commit messages (see below)

#### Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(canvas): add zoom controls to toolbar
fix(api): handle rate limit errors from OpenAI
docs(readme): update installation instructions
```

#### Pull Requests

1. **Update your fork** - Rebase on main before submitting
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a PR** - Include:
   - Clear title and description
   - Link to related issues
   - Screenshots for UI changes
   - List of changes made

4. **Respond to feedback** - Be open to suggestions and make requested changes

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use shadcn-svelte components for UI (don't create custom primitives)
- Keep components small and focused
- Add comments for complex logic

### UI Components

Always use shadcn-svelte components:
```bash
npx shadcn-svelte@latest add button
npx shadcn-svelte@latest add dialog
# etc.
```

### Adding LLM Providers

See the README for instructions on adding new LLM providers.

### Database Changes

1. Create a new migration file in `supabase/migrations/`
2. Use descriptive names: `XXX_description.sql`
3. Include both up and down migrations if possible
4. Test migrations locally before submitting

### Testing

- Test your changes manually in the browser
- Verify on both light and dark themes
- Check responsive behavior on different screen sizes

## Project Structure

```
src/
├── routes/           # SvelteKit routes
├── lib/
│   ├── components/   # UI components
│   ├── llm/          # LLM provider logic
│   ├── services/     # Business logic
│   └── utils/        # Utility functions
└── hooks.server.ts   # Server hooks
```

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: See [SECURITY.md](SECURITY.md)

## Recognition

Contributors will be recognized in:
- The GitHub contributors list
- Release notes for significant contributions

Thank you for contributing to PromptMux!
