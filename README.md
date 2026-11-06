# Krushi Mitra

**Krushi Mitra** is a small academic project that gives farmers in Odisha one place to view weather, record crop concerns, and review earlier submissions. It is built with React and JavaScript, with a small Express API and SQLite database.

## Project summary

### Aim

Build a simple web application that helps a farmer keep basic crop and location information together and receive general, clearly labelled guidance.

### Main functions

- Create an account, sign in, and maintain a farmer profile.
- Save a village, block, district, and optional GPS location.
- View current weather from Open-Meteo. WeatherAPI can be enabled with an API key.
- Submit a crop photo, crop and growth-stage details, and select the main visible symptom.
- Get immediate offline guidance from a small symptom rule set. The photo is saved with the report; the app does not scan its pixels or claim to identify disease automatically.
- Review previous submissions and export the list as CSV.
- Use English or Odia text in the interface.

### Modules

| Module | Purpose |
| --- | --- |
| React interface | Account screens, profile, weather, crop submission, and history |
| Express API | Input checks, account sessions, weather and diagnosis requests |
| SQLite database | Farmer accounts, sessions, and diagnosis records |
| Local image storage | Saves uploaded photos privately under the data folder |
| External services | Open-Meteo weather by default; optional WeatherAPI |

### Simple request flow

```text
Farmer's browser → React app → Express API → SQLite / image folder
                                     ├──────→ Open-Meteo weather
                                     └──────→ Local symptom rules
```

### Technology

- Frontend: React, Vite, plain CSS
- Backend: JavaScript, Node.js, Express
- Database: SQLite using Node's built-in `node:sqlite`
- Deployment: Docker Compose on one AWS EC2 instance

## Run locally

Use Node.js 22.5 or newer. The app does not require a paid API key for its basic workflow.

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite serves the React interface and forwards API calls to the Node server on port 8080.

To run the built app locally:

```sh
npm run build
npm start
```

Then open [http://localhost:8080](http://localhost:8080). Local database and uploaded photos are stored in `data/`.

## Crop guidance setup

Crop photo analysis uses Google Gemini when `GEMINI_API_KEY` is configured on the backend. The backend sends the uploaded image plus crop, growth stage, selected symptom, and locality to Gemini; the key is never sent to the browser. Gemini's structured findings are saved with the crop report. If the key is missing or Gemini fails, the report is still saved using the local symptom guide and is labeled as a fallback. Both paths provide guidance, not a confirmed diagnosis.

Create a new Gemini API key in Google AI Studio, copy `.env.example` to `.env`, and replace the placeholder with your key:

```sh
cp .env.example .env
npm run dev
```

Put the key on the `GEMINI_API_KEY=` line in `.env` (no quotes required). The backend loads this file on startup. Keep the key out of React `.env` variables, Git, screenshots, and shared files. Restart the backend after setting or changing it. The default model is `gemini-3.8-flash`; set `GEMINI_MODEL` if your account uses another vision-capable Gemini model. Check `/api/status`: crop analysis should show `configured: true` and provider `Gemini image analysis`.

## Other optional service settings

Add credentials to the deployment environment and do not commit them to source control.

| Variable | Use |
| --- | --- |
| `WEATHER_API_KEY` | Optional WeatherAPI key; Open-Meteo is the default |
| `WEATHER_API_URL` | Optional WeatherAPI endpoint override |
| `GEMINI_API_KEY` | Optional server-side key for image-based crop analysis |
| `GEMINI_MODEL` | Optional vision-capable Gemini model name |
| `COOKIE_SECURE` | Set to `true` when serving the app over HTTPS |

Browser GPS works on `localhost` or an HTTPS website and requires the farmer's permission. If no location or weather provider is available, the app reports that weather could not be retrieved.

## Deploy on AWS EC2

This project uses a single EC2 virtual machine and Docker Compose to keep deployment understandable for a college project. SQLite and photos stay in the Compose data volume. This setup is intended for a demonstration or small class project; it is not a multi-server production design.

1. In the AWS EC2 console, launch an Amazon Linux 2023 instance. Create a security group with SSH (port 22) allowed only from your own IP address and a temporary demo rule for TCP port 8080. AWS recommends restricting SSH to your IP; the security group controls which inbound traffic reaches the instance ([AWS security group guidance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html)).
2. Connect to the instance and install Docker using AWS's [Amazon Linux 2023 instructions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html). Install the Docker Compose plugin using [Docker's Linux instructions](https://docs.docker.com/compose/install/linux/). Enable Docker and reconnect after adding your account to the Docker group.
3. Copy this project to the instance using `git clone` (if the code is in a Git repository) or `scp` from your computer. Change to the project directory.
4. Start the app:

   ```sh
   docker compose up -d --build
   ```

5. Open `http://YOUR-EC2-PUBLIC-IP:8080` in a browser. Check the app health at `http://YOUR-EC2-PUBLIC-IP:8080/api/status`.

Useful maintenance commands:

```sh
docker compose logs -f
docker compose down          # keeps the database volume
docker compose up -d --build # rebuild and start after code changes
```

The `krushi-data` Docker volume keeps the SQLite file and uploaded photos when the container is rebuilt or restarted. Keep the EC2 instance's EBS storage and take backups before replacing or terminating the instance. Do not run multiple app instances against this SQLite volume. For an HTTPS launch, put a TLS-enabled reverse proxy or load balancer in front, then set `COOKIE_SECURE=true`; GPS also requires HTTPS outside localhost. AWS's EC2 guidance lists HTTP/HTTPS ports 80 and 443 for websites and advises limiting SSH access to a known IP ([AWS inbound rule examples](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html)).

## Testing

Run the staged checks with:

```sh
npm run verify
```

1. **Unit tests** check validation, language strings, password/session helpers, and provider behavior.
2. **Integration tests** exercise the API routes with a temporary SQLite database.
3. **System test** builds the React app, starts the production server, and completes a farmer workflow over HTTP.

## Project limits

- Crop guidance is an educational aid, not a confirmed diagnosis or a replacement for a local agricultural expert.
- Crop guidance is created from the farmer's selected symptom and a local rule set; it does not automatically identify disease from the photo.
- Weather depends on network access and the selected provider.
- Soil recommendations and a curated regional crop dataset are outside this project's current scope.
- SQLite and local image storage suit a single small deployment. A larger service would need managed database and file storage, but those are intentionally not added to this simple academic version.
