# Deployment Guide for Restaurant Organizer

You have connected your project to GitHub. Now you have two main options to deploy your application to the internet.

## Option 1: Vercel (Recommended & Easiest)
Vercel is the creators of Next.js and offers the seamless integration with GitHub.

1.  **Sign Up/Login**: Go to [vercel.com](https://vercel.com) and sign up using your **GitHub account**.
2.  **Add New Project**:
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your `restaurant-organizer` repository from the list.
3.  **Configure Project**:
    *   Vercel will auto-detect it's a Next.js project.
    *   **Environment Variables**: Expand the "Environment Variables" section.
    *   Add your Google Maps API key (and any other keys from `.env.local`):
        *   Key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
        *   Value: `your_actual_api_key_here`
4.  **Deploy**: Click **"Deploy"**.
    *   Vercel will build and deploy your site.
    *   Once finished, you will get a URL (e.g., `restaurant-organizer.vercel.app`).

**Pros**:
*   Automatic deployments when you push to GitHub.
*   Free tier is very generous.
*   Zero server maintenance.

---

## Option 2: Synology NAS (Self-Hosted via Docker)
If you prefer to host it yourself on your Synology NAS, your project is already configured with a `Dockerfile` for this purpose.

### Prerequisites
*   **Container Manager** (or Docker) installed on your Synology NAS.
*   **SSH Access** to your Synology (optional but easier for building) OR a way to build the image on your computer and push it to a registry (like Docker Hub).

### Steps

#### 1. Build the Docker Image
You can build the image on your computer:

```bash
# Build the image (replace 'your-username' with your Docker Hub username)
docker build -t your-username/restaurant-organizer:latest .
```

#### 2. Push to Registry (Optional)
If you built it locally, push it to Docker Hub so your Synology can pull it.
*(Alternatively, you can export the image as a tar file and upload it manually).*

```bash
docker push your-username/restaurant-organizer:latest
```

#### 3. Run on Synology
1.  Open **Container Manager** on Synology.
2.  Go to **Registry** and download your image (`your-username/restaurant-organizer:latest`).
3.  Go to **Image**, select the image, and click **Run**.
4.  **General Settings**:
    *   Name: `restaurant-organizer`
    *   Enable "Enable auto-restart" (optional).
5.  **Port Settings**:
    *   Local Port: `3000` (or any available port like `8080`).
    *   Container Port: `3000`.
6.  **Environment Variables**:
    *   Add your API keys here!
    *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = `your_key`
7.  **Finish**: Start the container.

### Accessing the App
*   **Local Network**: `http://YOUR_NAS_IP:3000`
*   **Internet Access**: You will need to set up **Port Forwarding** on your router (forward external port 80/443 or a custom port to your NAS IP:3000) OR use **Synology Reverse Proxy** (Control Panel -> Login Portal -> Advanced -> Reverse Proxy) to map a domain to `localhost:3000`.

**Pros**:
*   Total control over your data.
*   Runs on your existing hardware.

**Cons**:
*   Requires manual updates (pull new image & restart).
*   Requires network configuration for outside access (Port forwarding/Reverse Proxy).
