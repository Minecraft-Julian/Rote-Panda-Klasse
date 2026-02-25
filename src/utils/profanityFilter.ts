// Simple German/English profanity filter
const BANNED_WORDS = [
  // German profanity
  'scheiße', 'scheisse', 'scheiß', 'scheis',
  'fick', 'ficken', 'gefickt',
  'arsch', 'arschloch',
  'wichser', 'wichsen',
  'hurensohn', 'hure',
  'verdammt', 'verpiss',
  'idiot', 'vollidiot',
  'dummkopf', 'depp', 'trottel',
  'blödmann', 'blödman', 'blöde', 'blöd',
  'nazi', 'hitler',
  'bastard',
  'schlampe',
  'penner',
  'kacke', 'kack',
  // English profanity
  'fuck', 'fucking', 'fucked',
  'shit', 'bullshit',
  'ass', 'asshole',
  'bitch',
  'damn',
  'crap',
  'idiot',
  'stupid',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lower) || lower.includes(word);
  });
}

export function filterProfanity(text: string): string {
  let result = text;
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    result = result.replace(regex, '*'.repeat(word.length));
  });
  return result;
}
