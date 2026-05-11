# APIMart GPT-Image-2 Image-to-Image Web UI

A lightweight React and Vite web interface for APIMart `gpt-image-2-official` image-to-image generation through an n8n production webhook.

The application provides a focused parameter-selection interface for uploading a reference image or using a public image URL, submitting generation parameters to n8n, and displaying the generated result with task metadata and a compact response view.

## Features

- Image-to-image generation form for APIMart `gpt-image-2-official`
- Supports local reference image upload
- Supports public reference image URL input
- Exposes generation parameters including size, resolution, quality, background, moderation, output format, and image count
- Connects to an n8n production webhook
- Displays generated image result
- Provides image preview and download actions
- Displays task ID and generation status
- Shows a compact core response instead of rendering large base64 payloads
- Responsive layout suitable for desktop and mobile browser usage

## Technology Stack

- React 18
- TypeScript
- Vite
- lucide-react
- n8n production webhook
- APIMart image generation API, called from n8n

## Project Structure

```text
.
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .gitignore
└── src
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    └── vite-env.d.ts
```

## n8n Workflow

The frontend is designed to call the following production webhook:

```text
https://englocal001.app.n8n.cloud/webhook/apimart-gpt-image-2-image-to-image-web-ui
```

The n8n workflow is responsible for:

1. Receiving `multipart/form-data` from the frontend.
2. Normalizing prompt, reference image, and generation parameters.
3. Calling APIMart `/v1/images/generations`.
4. Extracting the returned `task_id`.
5. Polling APIMart `/v1/tasks/{task_id}` until completion.
6. Extracting the final image URL.
7. Returning a JSON payload to the frontend.

APIMart credentials must remain in n8n credentials. Do not expose APIMart API keys in the frontend.

## Environment Configuration

Create a local `.env` file if you need to override the default webhook URL:

```bash
cp .env.example .env
```

Then edit:

```text
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/apimart-gpt-image-2-image-to-image-web-ui
```

If no `.env` value is provided, the application uses the default production webhook defined in `src/App.tsx`.

## Installation

```bash
npm install
```

## Local Development

Start the development server:

```bash
npm run dev -- --port 5173
```

Open the app:

```text
http://localhost:5173
```

## Mobile Testing on Android

To test from an Android phone on the same Wi-Fi network, start Vite with LAN access enabled:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Find the computer's Wi-Fi IPv4 address on Windows:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'WLAN' -and $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress
```

Then open the following URL on the Android phone:

```text
http://<computer-ipv4-address>:5173
```

Example:

```text
http://192.168.121.114:5173
```

The computer and phone must be connected to the same Wi-Fi network. If the page does not load, check Windows Firewall and confirm that the development server is listening on `0.0.0.0`.

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

This project can be deployed to any static hosting platform that supports Vite builds, including:

- Vercel
- Netlify
- Cloudflare Pages
- Nginx
- Static hosting on a VPS

The build output is generated in:

```text
dist/
```

Configure the production environment variable on the hosting platform:

```text
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/apimart-gpt-image-2-image-to-image-web-ui
```

## Request Fields

The frontend submits the following fields to n8n:

| Field | Description | Default |
| --- | --- | --- |
| `prompt` | Image generation prompt | Required |
| `reference_image` | Uploaded local reference image | Optional |
| `reference_image_url` | Public reference image URL | Optional |
| `model` | APIMart model name | `gpt-image-2-official` |
| `size` | Image aspect ratio | `9:16` |
| `resolution` | Output resolution | `2k` |
| `quality` | Generation quality | `medium` |
| `background` | Background handling | `auto` |
| `moderation` | Moderation setting | `auto` |
| `output_format` | Output image format | `png` |
| `n` | Number of images | `1` |

At least one reference image source is required: either `reference_image` or `reference_image_url`.

## Response Handling

The frontend stores the full response internally but renders only compact core fields in the response panel. Large base64 image fields such as `imageDataUrl` are omitted or truncated in the UI to prevent browser performance issues.

Core displayed fields include:

- `success`
- `taskId`
- `taskStatus`
- `pollAttempt`
- `imageUrl`
- `fileName`
- `mimeType`
- `completedAt`
- compact request and APIMart response summaries

## Security Notes

- Do not place APIMart API keys in frontend code.
- Keep APIMart credentials inside n8n credential storage.
- The current webhook is intended for personal use. If exposed publicly or shared with other users, add authentication or a request token at the n8n webhook layer.
- Avoid committing local `.env` files.
- Do not commit `node_modules`, `dist`, or test screenshots.

## Troubleshooting

### The app opens but generation fails

Check whether the APIMart credential is correctly attached to the APIMart HTTP Request nodes in n8n.

### Android cannot open the local development URL

Use the computer's LAN IPv4 address instead of `localhost`. Also confirm that the Vite server was started with:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

### The response panel becomes slow

Ensure the frontend is using the compact response view and does not render raw base64 payloads. The current implementation filters long data URL fields before displaying response JSON.

### Production webhook does not trigger

Confirm that the URL uses:

```text
/webhook/
```

and not:

```text
/webhook-test/
```

## Repository

```text
https://github.com/engsd/n8n-1-webUI
```
