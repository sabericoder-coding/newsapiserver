import app from "./app";
import { toFetchHandler } from "srvx/node";

interface AppwriteFunctionContext {
  req: {
    raw: Request;
  };
  log: (message: string) => void;
  error: (message: string) => void;
}

const fetchHandler = toFetchHandler(app);

export default async ({
  req,
  error,
}: AppwriteFunctionContext): Promise<Response> => {
  try {
    return await fetchHandler(req.raw);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);

    error(`Country Pulse API request failed: ${message}`);

    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};