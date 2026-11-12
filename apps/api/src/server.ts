import { config } from "./config.js";
import { createApp } from "./app.js";

const port = config.PORT;
createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
