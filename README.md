# Beanstalk Console

A beanstalkd administration console built with React, Vite, and Node.js. The
browser uses a same-origin JSON API, and Node connects to beanstalkd over TCP.

## Project layout

| Path | Contents |
| --- | --- |
| `index.html`, `vite.config.js` | Vite entry page and development configuration |
| `src/main.jsx`, `src/App.jsx` | React entry point and application |
| `src/components/`, `src/features/console/` | Shared interface components and console features |
| `src/lib/`, `src/assets/`, `src/styles/` | API client, images, and styles |
| `server/`, `test/` | Node API and its tests |
| [`legacy/`](legacy/README.md) | Standalone PHP version and its deployment files |

## Run locally

Use Node.js 22.12 or newer. With a beanstalkd instance listening on port 11300:

```sh
npm ci
npm run build
npm start
```

Open <http://127.0.0.1:3080>. For a different queue server or several configured
servers, set a comma-separated server list in the checkout's `.env` file or
pass it when starting the console:

```sh
BEANSTALK_SERVERS='Local=127.0.0.1:11300,Workers=workers.internal:11300' npm start
```

### Development

After `npm ci`, run `npm run api` and `npm run dev` in separate terminals.
Open the URL printed by Vite. The development server proxies `/api`,
`/beanstalk/api`, and legacy form submissions to `http://127.0.0.1:3080` by
default. Set `VITE_API_TARGET` in the Vite process environment when the API
listens elsewhere.

## Configuration

If you don't have a `.env` file yet, copy [`.env.example`](.env.example) to
`.env` in the project root. Fill in `CONSOLE_USERNAME` and `CONSOLE_PASSWORD`
to enable sign-in, then restart `npm start` or `npm run api`. With Docker
Compose, apply changes with `docker compose up -d web`.

| Environment variable | Behavior |
| --- | --- |
| `BEANSTALK_SERVERS` | Comma-separated `label=host:port` or `beanstalk://host:port` entries. A bare hostname uses port 11300. |
| `BEANSTALKD_HOST`, `BEANSTALKD_PORT` | Add a default server, with port 11300 if omitted. With neither server setting present, the console uses `127.0.0.1:11300`. |
| `HOST`, `PORT` | HTTP bind address and port. Defaults to `127.0.0.1:3080`. |
| `CONSOLE_USERNAME`, `CONSOLE_PASSWORD` | Set both to enable web sign-in. Sessions last up to 12 hours and end when the Node process restarts. API clients can send an explicit HTTP Basic authorization header. |
| `ALLOW_PERSONAL_SERVERS` | Allows users to manage the browser's server list and open direct server links. Defaults to `true` for direct Node and Docker Compose deployments. Use `false` to disable it or `local` to allow only direct loopback access on a loopback bind. If sign-in is disabled, anyone who can reach the console can use this feature. |
| `CONSOLE_SECURE_COOKIES` | Set to `true` when serving over HTTPS to mark the session and personal server cookies as secure. |
| `SHARED_SERVERS_STORAGE` | Path to the shared-link server registry. Defaults to `shared-servers.json` alongside the sample data file. Use a single console instance for writes. |
| `SAMPLE_STORAGE` | Path to the writable sample data file. Defaults to the checkout's `storage.json`. Its parent directory must be writable so the console can replace the file atomically. |

The console creates each storage file on its first write. Browser server lists
are stored in a `browser-servers/` directory alongside the sample file. Its
parent must already exist and be writable. Keep the directory and the storage
files on persistent storage to retain lists, samples, and shared links across
deployments.

## Docker Compose

```sh
docker compose up --build
```

Open <http://127.0.0.1:3080>. The Node container connects to the Compose
beanstalkd service. By default, Compose publishes port `3080` on all IPv4
interfaces (`0.0.0.0`). Set `CONSOLE_BIND=127.0.0.1` for host-only access or
use `CONSOLE_PORT` to change the published port. Sample jobs are stored in
the `console_data` volume.
If you already have a `storage.json` backup, you can import it into an empty
volume with this command:

```sh
docker compose exec -T web sh -c 'set -C; cat > /data/storage.json' < storage.json
```

## Using the console

- **Navigation.** Open a server or tube from the searchable selectors. The
  tube list also has its own filter. The console preserves the auto-refresh
  choice in the browser and carries `auto_refresh` between console pages.
- **Sign-in and appearance.** When authentication is enabled, the console
  opens a web sign-in form at the requested URL. To end the session, use
  **Settings → Sign out**. The theme follows the system by default, and
  **Small** is the initial font size. Both can be changed under Appearance.
- **Jobs and samples.** Tube details show the next ready, delayed, and buried
  jobs. Search scans a bounded range of job IDs and can continue from the
  next range. **View full payload** formats valid JSON automatically. **Format
  JSON** is available in **Add Job** and the sample editor. Plain text stays
  as entered or stored.

### Bulk tube actions

On **All tubes**, select tubes to reveal the floating action bar. It offers
kick actions, **Pause**, **Resume**, and **Clear jobs**. The table header
checkbox selects the tubes visible under the current filter. The action bar
counts previously selected tubes that are hidden by the filter too.

**Clear jobs** opens a confirmation with the selected tube names. The
operation runs in the background while you continue using the console. It
deletes ready, delayed, and buried jobs. Reserved jobs are skipped. Each
request accepts up to 50 tubes and stops at 1,000 deletions per tube or when
the shared 10-second processing budget is reached. The result notification
reports deletions per tube and flags partial results when a limit is reached
or a request times out.

Moving jobs creates new job IDs in the destination tube and retains the
payload, priority, TTR, and remaining delay. Buried jobs move as ready jobs.
The operation result reports copies whose source deletion could not be
confirmed.

## Sharing server links

Copy a server or tube URL from the address bar. Configured servers and servers
saved through **Add server** or **Edit Server** resolve on the same console
instance without the sender's browser cookie. Server list customization still
belongs to the current browser. Removing an entry from that list leaves existing
shared links usable. Older personal entries can be registered by saving them in
**Edit Server** once. Recipients need access to the console's HTTP address and
its configured authentication.

On the first change to a browser's list, the console migrates entries and hidden
servers from its old cookie into server storage. **All servers** shows 25 entries
per page and only requests stats for the current page.

On a direct loopback connection or a console with personal
server access enabled, `server=host:port` can also open an address that is
absent from the configured and personal lists. This does not save the address.

## Legacy console URLs

The React console can be opened at `/` or `/beanstalk/`. Both entry points
accept links using the PHP query parameters, for example:

```text
/beanstalk/?server=127.0.0.1:11300
/beanstalk/?server=127.0.0.1:11300&filter=emails*&auto_refresh=true
/beanstalk/?server=127.0.0.1:11300&tube=emails&action=search&searchStr=retry&limit=25
/beanstalk/?action=editSample&key=<sample-key>
```

Old action names and form field names are still accepted at these URLs.
Links that change queue data open a confirmation and submit a POST. Direct
GET requests to those links leave the queue intact. Polling reads JSON from
the Node API instead of the PHP HTML fragment endpoint.

## Migrating from PHP

See the [PHP console README](legacy/README.md) for the standalone legacy
app. Copy server configuration from `legacy/config.php` to the Node
environment variables. The Node console reads the existing version-1 sample
format and uses `storage.json` in the repository root by default. The PHP
console uses `legacy/storage.json`. Back up sample data before migrating and
give one console instance ownership of writes to each file.

If personal servers are enabled, the Node console can read the old
`beansServers` cookie when it is available on the same address.

## Verification

Run `npm test` for the API and sample storage tests. Set `BEANSTALKD_BIN` to
a local beanstalkd executable to include the queue integration test. The test
starts an isolated daemon and uses temporary sample storage.
