# Beanstalk Console

A beanstalkd administration console built with React, Vite, and Node.js. The
browser uses a same-origin JSON API, and Node connects to beanstalkd over TCP.
The application runs with Node.js and beanstalkd.

## Project layout

| Path | Contents |
| --- | --- |
| `index.html`, `vite.config.js` | Vite entry page and development configuration |
| `src/main.jsx`, `src/App.jsx` | React entry point and application |
| `src/components/`, `src/features/console/` | Shared interface components and console features |
| `src/lib/`, `src/assets/`, `src/styles/` | API client, images, and styles |
| `public/` | Static assets copied into the production build, including the favicon |
| `server/`, `test/` | Node API and its tests |

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
`.env` in the project root. Sign-in is optional. Set both `CONSOLE_USERNAME`
and `CONSOLE_PASSWORD` to enable it. Apply configuration changes by restarting
the Node process or running `docker compose up -d web` for a Compose deployment.

| Environment variable | Behavior |
| --- | --- |
| `BEANSTALK_SERVERS` | Comma-separated `label=host:port` or `beanstalk://host:port` entries. A bare hostname uses port 11300. |
| `BEANSTALKD_HOST`, `BEANSTALKD_PORT` | Add a default server, with port 11300 if omitted. With neither server setting present, the console uses `127.0.0.1:11300`. |
| `HOST`, `PORT` | HTTP bind address and port for Node run directly. Defaults to `127.0.0.1:3080`. |
| `CONSOLE_BIND`, `CONSOLE_PORT` | Host bind address and published port for Docker Compose. Defaults to `0.0.0.0:3080`. |
| `CONSOLE_USERNAME`, `CONSOLE_PASSWORD` | Set both to enable web sign-in. Sessions last up to 12 hours and end when the Node process restarts. API clients can send an explicit HTTP Basic authorization header. |
| `ALLOW_PERSONAL_SERVERS` | Allows users to manage the browser's server list and open direct server links. Defaults to `true` for direct Node and Docker Compose deployments. Use `false` to disable it or `local` to allow only direct loopback access on a loopback bind. If sign-in is disabled, anyone who can reach the console can use this feature. |
| `CONSOLE_SECURE_COOKIES` | Set to `true` when serving over HTTPS to mark the session and personal server cookies as secure. |
| `SHARED_SERVERS_STORAGE` | Path to the shared-link server registry. Defaults to `shared-servers.json` alongside the sample data file. Use a single console instance for writes. |
| `SAMPLE_STORAGE` | Path to the writable sample data file. Defaults to the checkout's `storage.json`. Its parent directory must be writable so the console can replace the file atomically. |

The console creates each storage file on its first write. Browser server lists
are stored in a `browser-servers/` directory alongside the sample file. Its
parent must already exist and be writable. The default storage files and
`browser-servers/` are gitignored. Keep them on persistent storage to retain
lists, samples, and shared links across deployments.

## Docker Compose

```sh
docker compose up --build
```

Open <http://127.0.0.1:3080>. The Node container connects to the Compose
beanstalkd service. By default, Compose publishes port `3080` on all IPv4
interfaces (`0.0.0.0`). Set `CONSOLE_BIND=127.0.0.1` for host-only access or
use `CONSOLE_PORT` to change the published port. The `console_data` volume
holds samples, browser server lists, and the shared-link registry under
`/data`. Run `docker compose up -d --build web` after updating the console
source to rebuild the frontend and Node backend together.

If you already have a `storage.json` backup, you can import it into an empty
volume with this command:

```sh
docker compose exec -T web sh -c 'set -C; cat > /data/storage.json' < storage.json
```

## Using the console

- **Navigation.** Open a server or tube from the searchable selectors. The
  tube list also has its own filter.
- **Settings.** Under **Appearance**, choose a theme and font size. The
  defaults are **System** and **Small**. Use the **Auto-refresh** switch on
  server and tube views. It starts off for a new browser unless the URL
  specifies `auto_refresh=true`. The console saves the choice in the browser
  and carries it between pages. **Advanced settings** controls the pause
  duration, search result limit, and job data display.
- **Sign-in.** With authentication enabled, sign in at the requested URL. Use
  **Settings → Sign out** to end the session.
- **Jobs and samples.** Tube details show the next ready, delayed, and buried
  jobs. Search scans a bounded range of job IDs. Use **Scan next range** to
  continue. **View payload** expands the selected result inline and formats
  valid JSON automatically. **Format JSON** is available in **Add job** and
  the sample editor. Plain text is displayed as stored, including PHP-serialized
  text when viewed with the default display settings.

### Bulk tube actions

On **All tubes**, select up to 50 tubes to use the floating action bar. The
header checkbox selects tubes visible under the current filter. Previously
selected tubes hidden by the filter still count and appear in the confirmation.

- **Kick** makes buried jobs ready. **Kick more** uses the count you enter,
  and **Kick all jobs** kicks up to 1,000 per tube.
- **Pause** temporarily stops workers from reserving jobs. The default pause
  is one hour. **Resume** lets workers reserve jobs again.
- **Clear jobs** permanently deletes ready, delayed, and buried jobs. It uses
  a limit of 1,000 deletions and a 10-second processing budget per tube.

### Deleting jobs in the background

On a tube's detail page, open the menu for **ready**, **delayed**, or
**buried** jobs and choose **Delete all** for that state. The confirmation
starts with the current count. You can edit **Maximum jobs to delete** before
submitting. The backend processes batches of up to 1,000 jobs until it reaches
that maximum, runs out of matching jobs, or encounters an error or a batch
that makes no progress. Jobs added during the operation may count toward the
same maximum.

You can start a deletion from tube detail, return to **All tubes**, and clear
other tubes in the same tab. The backend runs up to three tube deletions
at a time per server and queues the rest. A tube already queued or running is
skipped if selected again. Progress and results are reported per tube.
Once accepted, operations continue if you navigate away or close the tab.
The queue lives in memory and is lost if the Node process restarts.

### Moving jobs

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

With personal server access enabled, `server=host:port` can open an address
that is absent from the configured and personal lists. In `local` mode,
this works on direct loopback connections to a loopback-bound console.
Opening a direct link leaves the browser's server list as it was.

## Compatibility with existing links and data

The console opens at `/` or `/beanstalk/`. Existing `index.php` links
redirect to the corresponding console URL and retain their query parameters.
Both entry points accept bookmarks such as these.

```text
/beanstalk/?server=127.0.0.1:11300
/beanstalk/?server=127.0.0.1:11300&filter=emails*&auto_refresh=true
/beanstalk/?server=127.0.0.1:11300&tube=emails&action=search&searchStr=retry&limit=25
/beanstalk/?action=editSample&key=<sample-key>
```

The console accepts older action names and form fields. Links that change
queue data open a confirmation before submitting a POST.

The console can import an existing version-1 job sample file. Use the
storage path for your deployment described above. With personal servers
enabled, the console can also read the older `beansServers` cookie when
it is available on the same address.

## Verification

Run `npm test` for the API, storage, and deletion tests. Set
`BEANSTALKD_BIN` to a local beanstalkd executable to include the integration
test against an isolated daemon. Run `npm run build` to verify the production
frontend build.
