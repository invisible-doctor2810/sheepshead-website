export type SuitId = 'hearts' | 'diamonds' | 'spades' | 'clubs'
export interface Suit { id: SuitId; glyph: string; color: string; label: string; title: string }
export const club = { name: 'SHEEPSHEAD CLUB', tagline: 'Wisconsin\u2019s cards, played properly.' } // TODO: edit
export const SUITS: Suit[] = [
  { id: 'hearts', glyph: '\u2665', color: '#ff2e63', label: 'SOCIALS', title: 'Socials' },
  { id: 'diamonds', glyph: '\u2666', color: '#22e6ff', label: 'THE COUNCIL', title: 'The Council' },
  { id: 'spades', glyph: '\u2660', color: '#a259ff', label: 'THE RULES', title: 'The Rules' },
  { id: 'clubs', glyph: '\u2663', color: '#2bff9a', label: 'THE LEDGER', title: 'Score Ledger' },
]
