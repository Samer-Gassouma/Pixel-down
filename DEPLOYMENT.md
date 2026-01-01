# Deployment Guide - Pixel Down

## Architecture

- **Frontend**: Vercel (Next.js)
- **Backend**: FreeBSD Server at `100.110.228.97` port 3001
- **Database**: Supabase PostgreSQL
- **Connection**: Direct IP connection with port forwarding

## Server Setup (FreeBSD)

### IP Addresses
- **Public IP**: 196.179.155.152
- **Tailscale IP**: 100.110.228.97
- **Local IP**: 192.168.0.185
- **Server**: glitch.local

### Backend Deployment

1. SSH into server:
```bash
ssh ivan@100.110.228.97
```

2. Backend location:
```bash
cd ~/Pixel-down/backend
```

3. Start backend server:
```bash
npm run dev
# Server runs on http://localhost:3001
```

4. For production, use a process manager (PM2):
```bash
npm install -g pm2
pm2 start "npm run dev" --name "pixel-down-backend"
pm2 startup
pm2 save
```

### Firewall Configuration

The server uses PF (Packet Filter) firewall. To allow port 3001, add to `/etc/pf.conf`:
```
pass in on egress proto tcp from any to any port 3001
```

Then reload:
```bash
pfctl -f /etc/pf.conf
```

## Frontend Deployment (Vercel)

### Environment Variables for Vercel

Create these in your Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=http://196.179.155.152:3001
```

### Deployment Steps

1. Push code to GitHub (already done)
2. Go to [vercel.com](https://vercel.com)
3. Import project from GitHub: `Samer-Gassouma/Pixel-down`
4. Select `frontend` directory as root
5. Add environment variables listed above
6. Deploy

## Backend API Configuration

Update frontend to connect to the backend at:
```
http://100.110.228.97:3001
```

This is set in:
- `frontend/lib/playerData.ts` - Database utilities
- `frontend/app/game/page.tsx` - Socket.IO connection

Example:
```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://100.110.228.97:3001';
```

## Testing Connectivity

### Test backend from local machine:
```bash
curl -i http://100.110.228.97:3001
```

### Test from Vercel frontend:
```javascript
fetch('http://100.110.228.97:3001')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error)
```

## Port Forwarding (if needed)

If accessing from outside the network, set up port forwarding on your router:
- External port: 3001
- Internal IP: 192.168.0.185 (or use 100.110.228.97 via Tailscale)
- Internal port: 3001

Then access as:
```
http://196.179.155.152:3001
```

**Router Access**: Usually at `192.168.0.1` or `192.168.1.1`

Steps:
1. Log into your router admin panel
2. Find "Port Forwarding" settings
3. Create new rule:
   - External Port: 3001
   - Internal IP: 192.168.0.185
   - Internal Port: 3001
   - Protocol: TCP
4. Save and apply

## CORS Configuration

The backend may need CORS settings for Vercel domain:
- Add Vercel domain to allowed origins
- Currently should allow any origin (check server.ts)

## Database Deployment

Ensure Supabase SQL schema is deployed:
1. Go to Supabase dashboard
2. SQL Editor
3. Run `supabase_schema.sql`

This creates:
- `player_stats` table
- `matches` table
- `match_players` table

## Monitoring

Check server status:
```bash
ssh ivan@100.110.228.97 "ps aux | grep 'npm run dev'"
```

View logs:
```bash
ssh ivan@100.110.228.97 "tail -f ~/Pixel-down/backend/logs.txt"
```

## Troubleshooting

**Backend not connecting**
- Verify SSH connection works
- Check firewall allows port 3001
- Verify `npm run dev` is running

**Vercel frontend can't reach backend**
- Check `NEXT_PUBLIC_BACKEND_URL` environment variable
- Verify backend server IP is correct
- Test with `curl` from local machine

**Socket.IO connection failing**
- Ensure backend is running
- Check CORS settings in backend
- Verify port 3001 is open

## Quick Commands

Start backend on server:
```bash
ssh ivan@100.110.228.97 "cd ~/Pixel-down/backend && npm run dev &"
```

Check if backend is running:
```bash
curl http://100.110.228.97:3001 2>/dev/null && echo "Backend running" || echo "Backend down"
```

Restart backend:
```bash
ssh ivan@100.110.228.97 "pkill -f 'npm run dev' && cd ~/Pixel-down/backend && npm run dev &"
```
