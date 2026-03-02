import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ name: "bhvrd", status: "ok" });
});

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
