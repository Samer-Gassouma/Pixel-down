# Pixel Down - Presentation Script

**Total Time: ~10 minutes**

---

## Slide 1: Title (30 sec)

Hello everyone, today I'm presenting Pixel Down - a real-time multiplayer arena game I built for this class. It's a browser-based shooter where players compete against each other or play solo against bots.

---

## Slide 2: Project Overview (45 sec)

So what is Pixel Down? It's a fast-paced combat game with a coin economy. Players earn coins by defeating opponents, and can spend them on power-ups in the shop. All stats are saved to a database, so your progress carries over between sessions.

---

## Slide 3: Tech Stack (45 sec)

For the frontend I used Next.js 15 with TypeScript and Tailwind for styling. The game itself runs on HTML Canvas. The backend is a Node.js server using Socket.IO for real-time communication. Everything is deployed on Vercel, and I'm using Supabase for the database and authentication.

---

## Slide 4: System Architecture (45 sec)

Here's how the system works. The browser client has the React UI and the game canvas. It connects to the game server through WebSockets. The server runs the game loop and handles collision detection. For user data and authentication, the client talks to Supabase through REST APIs.

---

## Slide 5: Multiplayer Mode (45 sec)

In multiplayer mode, players can create a room or join with a game ID. The server synchronizes all player positions in real-time. It supports up to 10 players per match, with matches lasting 10 minutes. There's a live leaderboard that updates as players get kills.

---

## Slide 6: Offline Mode (45 sec)

When the backend is down, players can still play in offline mode against bots. The bots have three states - they patrol randomly, chase you when you get close, and stop to attack when in range. The same shop and coin system works in offline mode too.

---

## Slide 7: Combat and Economy (1 min)

For combat, you click to shoot projectiles. Each kill gives you 50 coins that drop on the ground. You walk over them to collect, and they expire after 30 seconds. At shop locations, you can buy buffs like speed boost, extra damage, mana regeneration, or a damage shield.

---

## Slide 8: Authentication (45 sec)

I used Supabase for authentication. Players sign up with email and password, verify their email, and get a secure session. The database stores player stats like coins and total kills, plus match history.

---

## Slide 9: Backend Health Detection (45 sec)

The app automatically detects if the backend is online. On page load, it pings the server with a couple retries. If it's online, you see the multiplayer options. If it's offline, you get a warning and can play offline mode instead.

---

## Slide 10: Game Canvas (45 sec)

The game renders on HTML Canvas. You see players as colored cubes, bots in red, projectiles, obstacles, shop areas, and coin drops. The camera follows your player and scrolls smoothly across the 2400 by 1600 pixel arena.

---

## Slide 11: Challenges and Solutions (1 min)

Some challenges I faced: keeping all clients in sync - solved with a server-authoritative model. Next.js had hydration errors with canvas - fixed by loading the game component only on the client. Bots were hard to balance - I used a state machine with specific ranges. Performance issues were solved with requestAnimationFrame and delta time.

---

## Slide 12: Live Demo (45 sec)

The game is live at pixel-down.vercel.app. You can create an account, start a multiplayer game and share the ID with friends, or play offline against bots. Feel free to try it out.

---

## Slide 13: Future Vision (45 sec)

For future scaling, we're thinking of turning the in-game coins into a crypto token on Solana - fast transactions, low fees, and players would actually own their coins. We'd also add purchasable player avatars so you can look unique in matches, maybe with rare editions that can be traded.

---

## Slide 14: Thank You (30 sec)

That's Pixel Down. The code is on GitHub and the game is live at the links shown. Any questions?

---

## Tips

- Speak slowly and clearly
- Make eye contact with the audience
- If doing live demo, have the game already loaded in a browser tab
- Practice timing - aim for under 10 minutes total
