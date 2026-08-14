# API Error Codes

All API errors follow the standard response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "requestId": "req-abc123",
    "details": {}  // Optional field-level validation errors
  }
}
```

## Standard HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 413 | Request entity too large |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION` | 400 | Request body failed validation (see `details` for field errors) |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `CONFLICT` | 409 | Resource already exists (duplicate email, etc.) |
| `RATE_LIMIT` | 429 | Too many requests in time window |
| `INTERNAL` | 500 | Unexpected server error (retry or contact support) |
| `BAD_REQUEST` | 400 | Malformed request |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit (images: 10MB, videos: 50MB) |
| `CORS_ERROR` | 403 | Request origin not allowed |
