# Deploying Node.js Backend to Hostinger VPS with CloudPanel

This guide explains how to deploy your Pony Node.js backend to a Hostinger VPS managed via CloudPanel.

## Prerequisites

1.  **Hostinger VPS** with **CloudPanel** installed.
2.  **Domain Name** pointed to your VPS IP address (A record).
3.  **SSH Access** to your VPS.
4.  **FTP/SFTP Client** (like FileZilla) or Git.

---

## Step 1: Create a Node.js Site in CloudPanel

1.  Log in to your **CloudPanel Admin Area** (usually `https://your-ip:8443`).
2.  Go to **Sites** -> **Add Site**.
3.  Select **Create a Node.js Site**.
4.  Fill in the details:
    *   **Domain Name**: `api.yourdomain.com` (or whatever domain you use for the backend).
    *   **Node.js Version**: Select **v16 LTS** or **v18 LTS** (Match your local environment).
    *   **App Port**: `3000` (Important: Must match the port in your `server.js` or `.env`).
    *   **User**: `pony_user` (or create a new one).
5.  Click **Create**.

---

## Step 2: Upload Project Files

You can upload files via **File Manager** in CloudPanel, **SFTP**, or **Git**.

### Option A: Using Git (Recommended)
1.  SSH into your server: `ssh pony_user@your-server-ip`
2.  Navigate to the site directory:
    ```bash
    cd /home/pony_user/htdocs/api.yourdomain.com
    ```
3.  Delete default files:
    ```bash
    rm -rf *
    ```
4.  Clone your repository (if public) or pull your code:
    ```bash
    git clone https://github.com/your-repo/pony-backend.git .
    ```
    *(If you don't use Git, see Option B)*

### Option B: Using SFTP / File Manager
1.  Compress your local `backend` folder (excluding `node_modules`).
2.  Upload the ZIP file to `/home/pony_user/htdocs/api.yourdomain.com/` on the server.
3.  Unzip the files.
4.  Ensure `server.js` and `package.json` are in the root of that folder.

---

## Step 3: Install Dependencies

1.  SSH into your server (if not already there).
2.  Go to your site directory:
    ```bash
    cd /home/pony_user/htdocs/api.yourdomain.com
    ```
3.  Install NPM packages:
    ```bash
    npm install --production
    ```

---

## Step 4: Configure Environment Variables

1.  Create a `.env` file in the site root:
    ```bash
    nano .env
    ```
2.  Paste your production configuration (update DB credentials):
    ```env
    PORT=3000
    DB_HOST=127.0.0.1
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name
    JWT_SECRET=your_secure_secret
    ```
3.  Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

---

## Step 5: Database Setup

1.  In **CloudPanel**, go to **Databases**.
2.  Click **Add Database**.
3.  Create a database (e.g., `pony_db`) and a user.
4.  Click **Manage** (opens phpMyAdmin).
5.  **Import** your local `db_schema.sql` (located in your backend folder) into the new database.

---

## Step 6: Start the Application with PM2

We have included an `ecosystem.config.js` file for easy management.

1.  In the SSH terminal (inside your site directory), run:
    ```bash
    pm2 start ecosystem.config.js --env production
    ```
2.  Save the PM2 list so it restarts on reboot:
    ```bash
    pm2 save
    ```

---

## Step 7: Configure Reverse Proxy (CloudPanel)

CloudPanel automatically sets up Nginx as a reverse proxy for Node.js sites, but ensure the port matches.

1.  In CloudPanel, go to **Sites** -> **api.yourdomain.com** -> **Vhost**.
2.  Look for the `location /` block. It should look something like this:
    ```nginx
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    ```
3.  If the port is different, change it to `3000` and click **Save**.

---

## Step 8: Verification

1.  Open your browser and visit `https://api.yourdomain.com`.
2.  You should see your backend response (e.g., "Server is running").
3.  Update your **Frontend App** (`api.js`) to point to this new URL instead of `localhost`.

---

## Troubleshooting

-   **Check Logs**: `pm2 logs pony-backend`
-   **Check Status**: `pm2 status`
-   **Restart App**: `pm2 restart pony-backend`
