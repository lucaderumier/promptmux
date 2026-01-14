# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in PromptMux, please report it responsibly.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, use GitHub's private vulnerability reporting:

1. Go to the Security tab of the repository
2. Click "Report a vulnerability"
3. Fill out the form with details

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution target**: Within 30 days (depending on severity)

## Security Measures

### Data Protection

- **API Keys**: User API keys are encrypted using AES-256-GCM before storage
- **Authentication**: Handled by Supabase Auth with secure session management
- **Row Level Security**: All database tables use RLS policies for user isolation

### BYOK Model

PromptMux uses a "Bring Your Own Key" model:
- Users provide their own LLM provider API keys
- Keys are encrypted at rest in the database
- Keys are only decrypted server-side when making API calls
- We never log or expose decrypted keys

### What We Don't Store

- We don't store your API keys in plain text
- We don't log API requests or responses
- We don't share any data with third parties

## For Self-Hosting

If you're self-hosting PromptMux:

1. **Generate a strong encryption key**
   ```bash
   openssl rand -hex 32
   ```

2. **Secure your environment variables**
   - Never commit `.env` files
   - Use secrets management in production
   - Rotate keys periodically

3. **Enable Supabase RLS**
   - Ensure Row Level Security is enabled on all tables
   - Verify policies are correctly configured

4. **Use HTTPS**
   - Always deploy behind HTTPS
   - Use secure cookies for sessions

5. **Keep dependencies updated**
   ```bash
   pnpm update
   ```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Acknowledgments

We appreciate security researchers who help keep PromptMux secure. Responsible disclosure will be acknowledged in our release notes (with your permission).
