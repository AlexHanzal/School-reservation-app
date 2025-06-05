# Custom Domain Website

A simple website with Express.js server configured for custom domain access.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Access Your Website
- Local: http://localhost:3000
- Public: http://YOUR_SERVER_IP:3000

## Domain Configuration

### For Custom Domain Setup:

1. **Purchase a domain** from a registrar (GoDaddy, Namecheap, etc.)

2. **Configure DNS records:**
   - Add an A record pointing your domain to your server's IP address
   - Example: yourdomain.com → 123.456.789.123

3. **For production, use a reverse proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **For HTTPS, use Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

## Firewall Configuration

Make sure your server allows traffic on the port:
```bash
# For Ubuntu/Debian
sudo ufw allow 3000

# For CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Environment Variables

- `PORT`: Set custom port (default: 3000)
- `NODE_ENV`: Set to 'production' for production deployment
