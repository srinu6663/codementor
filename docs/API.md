# CodeMentor — API Reference

Base URL: `http://localhost:3001/api`

All protected routes require:  `Authorization: Bearer <jwt_token>`

---

## Auth

| Method | Endpoint              | Auth | Description                  |
|--------|-----------------------|------|------------------------------|
| POST   | `/auth/register`      | ✗    | Register a new user          |
| POST   | `/auth/login`         | ✗    | Login, returns JWT tokens    |
| POST   | `/auth/refresh`       | ✗    | Refresh access token         |
| POST   | `/auth/logout`        | ✓    | Invalidate refresh token     |
| GET    | `/auth/me`            | ✓    | Get current user profile     |

---

## Problems

| Method | Endpoint              | Auth  | Description                     |
|--------|-----------------------|-------|---------------------------------|
| GET    | `/problems`           | ✓     | List all problems               |
| GET    | `/problems/:id`       | ✓     | Get single problem              |
| POST   | `/problems`           | Faculty| Create a problem               |
| PUT    | `/problems/:id`       | Faculty| Update a problem               |
| DELETE | `/problems/:id`       | Faculty| Delete a problem               |

---

## Submissions

| Method | Endpoint                      | Auth    | Description                   |
|--------|-------------------------------|---------|-------------------------------|
| POST   | `/submissions`                | Student | Submit code for execution     |
| GET    | `/submissions/:id`            | ✓       | Get submission result         |
| GET    | `/submissions/problem/:pid`   | ✓       | My submissions for a problem  |
| GET    | `/submissions/all`            | Faculty | All submissions (analytics)   |

---

## Users (Admin)

| Method | Endpoint              | Auth  | Description                     |
|--------|-----------------------|-------|---------------------------------|
| GET    | `/users`              | Admin | List all users                  |
| PUT    | `/users/:id/role`     | Admin | Change user role                |
| DELETE | `/users/:id`          | Admin | Delete user                     |

---

## Response Format

All responses follow:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable description"
}
```

---

## Judge0 Language IDs (common)

| Language   | ID  |
|------------|-----|
| Python 3   | 71  |
| JavaScript | 63  |
| Java       | 62  |
| C++        | 54  |
| C          | 50  |
