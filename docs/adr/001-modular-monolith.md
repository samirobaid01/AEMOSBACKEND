# ADR 001: Modular Monolithic Architecture

## Status
Accepted

## Date
2023-05-07

## Context
We need to decide on the architecture pattern for AEMOS, which requires both a backend API for device communication and data management, and a frontend application for user interaction. We need to balance development speed, maintainability, and future flexibility.

## Decision
We will implement a modular monolithic architecture where the backend (Node.js/Express) and frontend (React/TypeScript) are housed in the same repository but remain logically separate with clear boundaries.

Key aspects of this approach:
1. Backend and frontend will be in separate directories within the same repository
2. All communication between frontend and backend will be through the API
3. Shared types will be defined in a common location for consistency
4. Build processes will be separated but can be orchestrated together
5. Deployment can be either as a single application or as separate services

## Consequences

### Positive
- Simplified development workflow with a single repository
- Easy coordination between frontend and backend changes
- Shared types ensure API contract consistency
- Simplified deployment for small to medium scale
- Easier onboarding for new developers (one codebase to learn)
- Clear path to microservices if needed in the future

### Negative
- Potential for tight coupling if boundaries aren't respected
- Repository could grow large over time
- May require more discipline to maintain separation of concerns
- Some duplication might occur between frontend and backend models

## Implementation Details
- Backend code will live in the `/src` directory
- Frontend code will live in the `/client` directory
- Shared types will live in the `/shared` directory
- Communication between frontend and backend will be exclusively through the REST API and WebSockets
- In development mode, the frontend will proxy API requests to the backend
- In production mode, the backend will serve the frontend as static files 