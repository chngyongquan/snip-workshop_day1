# Snip CLI

A zero-dependency Node.js CLI for the Snip URL shortener. Requires Node 20 or newer and a running Snip backend.

```bash
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
node cli.js help
```

The API defaults to `http://localhost:3000`. Set `SNIP_API` to use another backend URL. On Windows, use `snip.cmd` or `snip.ps1`; on macOS and Linux, use `./snip`.