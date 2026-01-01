export async function generateUsername(): Promise<string> {
  // Cool gaming username parts
  const adjectives = [
    'Shadow', 'Neon', 'Phantom', 'Thunder', 'Storm', 'Dark', 'Silent', 
    'Cyber', 'Frost', 'Blaze', 'Ghost', 'Venom', 'Steel', 'Rogue',
    'Crimson', 'Azure', 'Toxic', 'Rapid', 'Wild', 'Iron'
  ];
  
  const nouns = [
    'Strike', 'Viper', 'Blade', 'Dragon', 'Wolf', 'Hawk', 'Reaper',
    'Hunter', 'Sniper', 'Warrior', 'Knight', 'Phoenix', 'Titan',
    'Ranger', 'Assassin', 'Falcon', 'Demon', 'Striker', 'Ninja', 'Raider'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 99);
  
  // 70% chance to add number suffix
  const username = Math.random() > 0.3 
    ? `${randomAdjective}${randomNoun}${randomNum}`
    : `${randomAdjective}${randomNoun}`;
  
  return username;
}
