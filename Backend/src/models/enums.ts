// Keep the same role values in the database, backend and frontend.
export enum Role {
    Admin = 1,
    User = 2,
}

// Named HTTP response codes used by the API.
export enum HttpStatus {
    Created = 201,
    NoContent = 204,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    Conflict = 409,
    PayloadTooLarge = 413,
    UnprocessableEntity = 422,
    TooManyRequests = 429,
    InternalServerError = 500,
    ServiceUnavailable = 503,
}
