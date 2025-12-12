import { isCelebrateError } from "celebrate";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (isCelebrateError(err)) {
    const details = {};
    for (const [segment, detail] of err.details.entries()) {
      details[segment] = detail.message;
    }
    return res.status(400).json({
      message: "Validation failed.",
      details
    });
  }

  console.error("Error:", err);
  if (err.stack) {
    console.error("Stack:", err.stack);
  }
  if (res.headersSent) {
    return;
  }

  const status = err.status ?? 500;
  const message = err.message ?? "Internal server error.";

  res.status(status).json({ message });
}


