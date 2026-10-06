---
title: Copyparty with Authentik and Traefik
description: A practical setup for running Copyparty behind Traefik and Authentik with both anonymous and authenticated access.
date: 2026-01-22
tags:
  - copyparty
  - authentik
  - traefik
  - docker
  - homelab
---

I have successfully configured **Copyparty** to work with **Traefik** and **Authentik**. This setup allows some volumes to be accessible without authentication (anonymous) while others require a login.

### Prerequisites
*   Working instances of Copyparty, Traefik, and Authentik.
*   An **Authentik Proxy Outpost** configured to handle headers and cookies.
*   Authentik accessible at `auth.example.com`.

---

### 1. Authentik Setup (Optional)
**Create an "Always Allow" Policy**  
This is useful if you want to allow all users to access the Copyparty UI but manage specific volume permissions within the Copyparty configuration file itself.

*   **Type:** Expression
*   **Expression:** `return True`

---

### 2. Create the Authentik App and Provider
1.  **Provider Type:** Proxy Provider.
2.  **External Host:** `cpp.example.com` (or your chosen domain).
3.  **Mode:** Forward Auth (Single Application).
5.  **Bindings:** Assign the `always-allow` policy (or a specific group policy).

---

### 3. Docker Compose Configuration
For this deployment, I used the following Docker Compose setup. Note the specific labels used to handle the dual-router logic.

```yaml
services:
  copyparty:
    image: copyparty/ac
    container_name: idp_copyparty
    restart: unless-stopped
    user: "1000:1000"  # Match the UID/GID of your host fileshare
    volumes:
      - ./cpp/:/cfg:z    # Copyparty config folder
      - /srv/pub:/w:z    # Path to the files you want to share
    ports:
      - 3929:3923
    labels:
      - "traefik.enable=true"

      # Router 1: Authenticated Access
      # Triggered if an Authentik cookie is present OR if the user visits the info page (?h)
      - "traefik.http.routers.fs-auth.rule=Host(`cpp.example.com`) && (HeaderRegexp(`Cookie`, `authentik_proxy_[a-zA-Z0-9]+`) || Query(`h`))"
      - "traefik.http.routers.fs-auth.priority=100"
      - "traefik.http.routers.fs-auth.middlewares=auth@file" # Your Authentik middleware name
      - "traefik.http.routers.fs-svc.service=fs-svc"
      # Here is probably some other headers for tls and blabla

      # Router 2: Guest/Anonymous Access
      # Catch-all for everyone else
      - "traefik.http.routers.fs-guest.rule=Host(`cpp.example.com`)"
      - "traefik.http.routers.fs-guest.priority=50"
      - "traefik.http.routers.fs-guest.service=fs-svc"
      # Here is probably some other headers for tls and blabla

      - "traefik.http.services.fs-svc.loadbalancer.server.port=3929"
    stop_grace_period: 15s
    environment:
      LD_PRELOAD: /usr/lib/libmimalloc-secure.so.NOPE # Change NOPE to 2 for a speed boost (uses more RAM)
      PYTHONUNBUFFERED: 1
```

#### How the "Magic" Works:
Currently there is no straightforward way to allow unauthenticated access via traefik & authentik only (or i've doesn't know it).  
If you setup the auth middleware, traefik always will redirect users to auth, and there is no way to allow unauthorized access. You can specify the `Unanthorized paths` in a proxy provider, but this is also disables auth headers for this paths (e.g. if you specify main page here, copyparty doesn't get auth headers on main page, and you, probably will miss some volumes that require auth).

To bypass this, we create two routers:
1.  **`fs-guest`**: The default router with low priority. It allows anonymous access.
2.  **`fs-auth`**: A high-priority router that only activates if the user already has an Authentik session cookie or explicitly navigates to the Copyparty user info page (`/?h`).

This allows anonymous users to browse public files. When they click **"Login"** in Copyparty, they are sent to `/?h`, which triggers the `fs-auth` router, prompting Authentik to log them in.

---

### 4. copyparty.conf
Configure Copyparty to trust the headers provided by Authentik.

```ini
[global]
...
rproxy: 1      # Acknowledge we're behind a reverse proxy
xff-src: 10.10.0.0/16 # Your Traefik/Docker network subnet

# Identity Provider (IdP) Setup
idp-h-usr: X-authentik-username
idp-h-grp: X-authentik-groups
idp-login: https://cpp.example.com/?h
idp-logout: https://cpp.example.com/outpost.goauthentik.io/proxy_logout?slug=copyparty&rd=https://cpp.example.com

# Volume example
[/]              # Create a volume at the webroot
/mnt/storage     # Path inside the container
accs:
   r: *          # Read access for everyone (anonymous)
   A: @Infrastructure # Admin access for the "Infrastructure" group in Authentik.
```

**Note:** Ensure the `slug` in the logout URL matches the slug configured in Authentik.  

More volume access control examples [here](https://github.com/9001/copyparty/blob/dc8c229bcdc49419f16c983fe1f97d9d1e57bde2/docs/examples/docker/idp-authentik-traefik/cpp/copyparty.conf#L34).

---

### 5. Fixing the Logout Loop
By default, logging out through the proxy will result in a loop where the cookie remains in the browser but is invalid, causing constant redirects. To fix this, we use Traefik to manually wipe the cookie and redirect to the global Authentik session end-point.

Add these labels to your **Authentik Outpost** (or Traefik dynamic config):

```yaml
labels:
  traefik.enable: true
  
  # Match the Outpost path globally
  traefik.http.routers.authentik-proxy.priority: 100000
  traefik.http.routers.authentik-proxy.rule: PathPrefix(`/outpost.goauthentik.io/`)

  # Specific Logout Handling
  traefik.http.routers.authentik-proxy-logout.rule: PathPrefix(`/outpost.goauthentik.io/proxy_logout`)
  traefik.http.routers.authentik-proxy-logout.priority: 100001
  traefik.http.routers.authentik-proxy-logout.middlewares: logout-cookie, logout-redirect-global
  traefik.http.routers.authentik-proxy-logout.service: authentik-proxy

  # Middleware 1: Force clear the cookie (REPLACE authentik_proxy_XXXXXXX with your actual cookie name)
  traefik.http.middlewares.logout-cookie.headers.customResponseHeaders.Set-Cookie: authentik_proxy_62a3c243=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure 

  # Middleware 2: Redirect to the main Authentik application end-session URL
  traefik.http.middlewares.logout-redirect-global.redirectregex.regex: ^https?://[^/]+/outpost.goauthentik.io/proxy_logout\?.*slug=([^&]+)(?:.*rd=([^&]+))?.*$ 
  traefik.http.middlewares.logout-redirect-global.redirectregex.replacement: https://auth.example.com/application/o/$${1}/end-session/?next=$${2}
  
  traefik.http.services.authentik-proxy.loadbalancer.server.port: 8000
```

Here is some "dark magic."  

I discovered that if we navigate to cpp.example.com/outpost.goauthentik.io/log_out, the proxy resets the cookie's validity but doesn't clear the cookie itself. This results in a loop: we click logout, the proxy redirects us to Authentik, Authentik invalidates the cookie and redirects us back to cpp, Traefik sees the cookie and sends it to the proxy outpost for validation, the outpost rejects it and redirects us back to Authentik, and so on.  

To fix this, we need to create another router for /outpost.goauthentik.io/proxy_logout. This will tell Traefik to use the logout-cookie middleware to clear the cookie from the browser. After that, it should redirect us to the main Authentik URL (NOT the proxy one), and Authentik will handle the rest.  
Why can’t we redirect to the proxy? Because the proxy will set a new cookie before redirecting us to auth.example.com.  

**WARNING**: Make sure to change the cookie name, as yours will likely be different (e.g., authentik_proxy_XXXXX).  

---

With this configuration, anonymous users have read access to `/`.  
Once they authenticate via Authentik, they gain access to specific volumes based on their permissions (e.g., `Infrastructure` members receive admin access to `/`).

Hopefully, I haven't overlooked anything.

Source: [original GitHub Discussion](https://github.com/9001/copyparty/discussions/1236)
