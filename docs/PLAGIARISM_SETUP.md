# Plagiarism Detection Setup (JPlag)

CodeSphere uses [JPlag](https://github.com/jplag/JPlag) for local, offline,
token/structure-based plagiarism detection (robust to renamed variables and reordered logic).

## Fastest paths

- **Docker (recommended):** `backend/Dockerfile` already installs Java 17 and downloads the
  JPlag JAR — just `docker compose up --build`. Nothing else to do.
- **Local dev:** run `bash backend/scripts/setup-jplag.sh` (needs Java 17+). It downloads the
  JAR to `backend/jplag/jplag.jar`.

Until the JAR is present, the faculty "Run Plagiarism Check" button returns a clear
"JPlag not configured" message (HTTP 503) instead of failing — previously-stored results still display.

## Prerequisites (manual build alternative)

- Java 17+
- Maven (to build JPlag from source)

## Build JPlag JAR

```bash
git clone https://github.com/jplag/JPlag.git
cd JPlag
mvn clean package -DskipTests
# JAR is at: cli/target/jplag-*-jar-with-dependencies.jar
```

Copy the JAR to the expected location:

```bash
mkdir -p backend/jplag
cp JPlag/cli/target/jplag-*-jar-with-dependencies.jar backend/jplag/jplag.jar
```

Or set the environment variable:

```
JPLAG_JAR_PATH=/absolute/path/to/jplag.jar
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `JPLAG_JAR_PATH` | `backend/jplag/jplag.jar` | Path to JPlag JAR |
| `JPLAG_THRESHOLD` | `0.70` | Minimum similarity (0–1) to flag a pair |
| `JAVA_BIN` | `java` | Path to Java executable |

## Docker (Recommended for Production)

The `backend` Docker image should include Java 17:

```dockerfile
# In backend/Dockerfile, add:
RUN apt-get install -y openjdk-17-jre-headless
COPY jplag/jplag.jar /app/jplag/jplag.jar
ENV JPLAG_JAR_PATH=/app/jplag/jplag.jar
```

## Permissions

By default, `run_plagiarism` permission is **disabled** for faculty.
An admin must grant it:

```
PATCH /api/faculty/permissions/:userId
{ "permissions": { "run_plagiarism": true } }
```

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/faculty/assignments/:id/plagiarism` | Run JPlag, store results |
| `GET`  | `/api/faculty/assignments/:id/plagiarism` | Fetch stored results |

The POST endpoint writes student submissions to a temp directory, shells out to JPlag,
parses the CSV output, persists similarity pairs to `plagiarism_results`, then cleans up the temp directory.
