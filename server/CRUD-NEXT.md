# Workout CRUD status (MongoDB)

## Implemented
- `GET /api/workouts`
  - uses MongoDB `WorkoutModel`
  - supports query params: `email`, `q`, `category`, `page`, `pageSize`, `sortBy`, `sortDir`
  - returns `workouts[]` with `id = String(workout._id)`

- `POST /api/workouts`
  - creates document in MongoDB
  - returns `workout.id` as Mongo `_id`

- `PUT /api/workouts/:id`
  - updates Mongo document by `_id` and `email`

- `DELETE /api/workouts/:id`
  - deletes Mongo document by `_id` and `email`

## Not yet fully migrated
- `POST /api/upload`
  - still uses in-memory `users[]` for lookup
  - should be updated to `UserModel.findOne({ email })` for full persistence

