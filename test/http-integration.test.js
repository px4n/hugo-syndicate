const axios = require("axios");
const http = require("http");

describe("HTTP Integration", () => {
  let server;
  let serverUrl;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks)) : null;

        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(
          JSON.stringify({
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: body,
          })
        );
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("axios makes real HTTP requests", async () => {
    const response = await axios.post(
      `${serverUrl}/test`,
      {
        title: "Test Article",
        content: "Test content",
      },
      {
        headers: {
          "api-key": "test-key",
          "content-type": "application/json",
        },
      }
    );

    expect(response.data.method).toBe("POST");
    expect(response.data.url).toBe("/test");
    expect(response.data.headers["api-key"]).toBe("test-key");
    expect(response.data.body.title).toBe("Test Article");
  });

  test("handles network errors", async () => {
    // Try to connect to a non-existent server
    await expect(axios.get("http://127.0.0.1:1", { timeout: 100 })).rejects.toThrow();
  });

  test("handles timeouts", async () => {
    // Create a slow server
    const slowServer = http.createServer((req, res) => {
      // Never respond
    });

    slowServer.listen(0, "127.0.0.1", async () => {
      const port = slowServer.address().port;

      await expect(axios.get(`http://127.0.0.1:${port}`, { timeout: 100 })).rejects.toThrow(/timeout/);

      slowServer.close();
    });
  });
});
