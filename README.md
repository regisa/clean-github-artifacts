# GitHub Artifacts Cleaner

A web application to manage and clean up GitHub Actions artifacts across your repositories. Built with Next.js and Tailwind CSS.

## Features

- GitHub OAuth authentication
- List all your repositories
- View artifact counts for each repository
- Bulk delete old artifacts

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   GITHUB_ID=your-github-oauth-app-id
   GITHUB_SECRET=your-github-oauth-app-secret
   ```
4. Create a GitHub OAuth App:

   - Go to GitHub Settings > Developer Settings > OAuth Apps
   - Create a new OAuth App
   - Set the homepage URL to `http://localhost:3000`
   - Set the callback URL to `http://localhost:3000/api/auth/callback/github`
   - Copy the Client ID and Client Secret to your `.env.local` file

5. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Visit `http://localhost:3000`
2. Sign in with your GitHub account
3. View your repositories and their artifact counts
4. Select repositories and delete old artifacts
