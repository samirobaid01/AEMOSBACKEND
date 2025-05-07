# AEMOS Frontend

Frontend application for the Automated Environmental Monitoring & Operations System (AEMOS).

## Code Structure

The application follows a clear separation of concerns:

- `/src/components`: Presentation/UI components
- `/src/containers`: Container components that handle data fetching and state management
- `/src/hooks`: Custom React hooks
- `/src/utils`: Utility functions
- `/src/services`: API and other service integrations
- `/src/state`: Redux state management

## Notes on Structure Cleanup

Previous codebase had duplicate container components in both `/features/*/containers` and `/containers`. 
The application was refactored to consolidate all containers in the `/containers` directory.

If you need to reference the previous implementation, check git history before [DATE].

## Development

```bash
# Install dependencies
npm install

# Run client development server only
npm run dev

# Build for production
npm run build
```

### Running Full Stack (Client & Server)

To run both the frontend and backend concurrently, use the root project command:

```bash
# From the project root directory (not client directory)
npm run dev
```

This will start both:
- The React frontend on http://localhost:5174 (or another available port)
- The Express backend API on http://localhost:3000

## Features

### Walkthrough
The application includes a guided walkthrough feature to help users navigate the system. This is implemented using `react-joyride` v3.0.0-7 which is compatible with React 19.

Key components:
- `client/src/components/Walkthrough.tsx` - Main component that displays the tour
- `client/src/config/walkthrough.ts` - Configuration of tour steps
- `client/src/store/slices/walkthroughSlice.ts` - Redux state management
- `client/src/services/walkthroughService.ts` - API integration
- `client/src/mocks/handlers.ts` - Mock API handlers for development

The walkthrough can be:
- Enabled/disabled in the settings
- Reset for new users
- Configured with different steps
- Translated to multiple languages

### Analytics
The application includes analytics tracking using Mixpanel.

### Internationalization
The application supports multiple languages using i18next.

## Technologies
- React 19
- TypeScript
- Redux Toolkit
- Material UI v7
- MSW v2 (for API mocking)
- React Router
- React Query
- i18next
