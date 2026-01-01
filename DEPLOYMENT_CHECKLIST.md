# Deployment Checklist ✅

## Server Setup (FreeBSD - DONE ✅)
- [x] Git installed
- [x] npm installed  
- [x] Backend cloned: `~/Pixel-down/backend`
- [x] Dependencies installed
- [x] Server running on `http://localhost:3001`

## Network Configuration (TODO)
- [ ] **Port Forward 3001**: Configure your router to forward external port 3001 → 192.168.0.185:3001
  - Public IP: **196.179.155.152**
  - Router IP: `192.168.0.1` (or check your router)
  
- [ ] **Test Backend Access**:
  ```bash
  curl http://196.179.155.152:3001
  ```

- [ ] **Firewall Rules**: Allow port 3001 in FreeBSD PF
  ```bash
  # SSH into server and run:
  ssh ivan@100.110.228.97
  # Then add to /etc/pf.conf:
  pass in on egress proto tcp from any to any port 3001
  ```

## Frontend - Vercel Deployment (TODO)
1. Go to https://vercel.com
2. Import GitHub repo: `Samer-Gassouma/Pixel-down`
3. Select root: `frontend`
4. Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://fnfamiooskpvtqjasqga.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZmFtaW9vc2twdnRxamFzcWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzI1MTIsImV4cCI6MjA4Mjg0ODUxMn0.I1Ygm5v6hD0M0TvHAdt9t8YKIEDg7kAXrTc8P35nzZc
   NEXT_PUBLIC_BACKEND_URL=http://196.179.155.152:3001
   ```
5. Deploy!

## Keep Backend Running (Production)
On the server, use PM2:
```bash
ssh ivan@100.110.228.97

cd ~/Pixel-down/backend

# Install PM2 globally
npm install -g pm2

# Start backend with PM2
pm2 start "npm run dev" --name "pixel-down"

# Make it auto-start on reboot
pm2 startup
pm2 save

# Check status
pm2 status
```

## Test the Connection
```bash
# From your machine, test:
curl -I http://196.179.155.152:3001

# From Vercel frontend (after deploying), it will automatically connect to backend
```

## URLs After Deployment
- **Frontend**: `https://your-vercel-domain.vercel.app`
- **Backend API**: `http://196.179.155.152:3001`

## Quick Server Commands
```bash
# Check if backend is running
ssh ivan@100.110.228.97 "ps aux | grep 'npm run dev'"

# Start backend manually
ssh ivan@100.110.228.97 "cd ~/Pixel-down/backend && npm run dev &"

# Stop backend
ssh ivan@100.110.228.97 "pkill -f 'npm run dev'"

# View recent backend logs
ssh ivan@100.110.228.97 "tail -20 ~/.pm2/logs/pixel-down-out.log"
```

## Important URLs
- **GitHub Repo**: https://github.com/Samer-Gassouma/Pixel-down
- **Vercel**: https://vercel.com
- **Supabase**: https://supabase.com
- **Server SSH**: `ssh ivan@100.110.228.97`
- **Tailscale Alt**: `ssh ivan@100.110.228.97` (using Tailscale IP: 100.110.228.97)

## Database
Make sure you've deployed the SQL schema to Supabase for persistent coins and match history.
