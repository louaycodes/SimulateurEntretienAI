# Contributing to Skill-Sphere

Thank you for your interest in contributing to Skill-Sphere! We welcome contributions from everyone.

## Development Setup

1. **Fork and Clone**
   Fork the repository to your GitHub account and clone it locally.

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   Ensure Docker is running, then start the database:
   ```bash
   npm run db:up
   npm run db:migrate
   ```

4. **Environment Variables**
   Copy `.env.example` to `.env.local` and add your Google Gemini API key.

## Code Style

- **TypeScript**: We use strict TypeScript. Avoid `any` whenever possible.
- **Linting**: Run `npm run lint` before committing.
- **Formatting**: Run `npm run format` (Prettier) to ensure consistent style.

## Commit Guidelines

We encourage [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new recruiter voice`
- `fix: resolve subtitle sync issue`
- `docs: update troubleshooting guide`
- `style: improve dashboard layout`
- `refactor: simplify speech recognition logic`

## Pull Request Process

1. Create a new branch for your feature (`git checkout -b feature/amazing-feature`).
2. Make your changes and commit them.
3. Push to your fork (`git push origin feature/amazing-feature`).
4. Open a Pull Request targeting the `main` branch.
5. Provide a clear description of your changes and any testing steps.

## Reporting Issues

If you find a bug or have a feature request, please open an Issue on GitHub with:
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)

Happy coding! 🚀
