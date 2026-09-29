export interface RulePage { title: string; body: string; videoUrl?: string; watchUrl?: string }

export const rules: RulePage[] = [
  {
    title: 'The Deal',
    body: 'The first dealer is determined arbitrarily. In the five-player game, the dealer gives six cards to each player and leaves two cards face down in the blind. Club etiquette is to make sure the last two cards are never placed in the blind. After the deal, calling begins with the player to the dealer’s left.',
  },
  {
    title: 'The Call',
    body: 'Starting to the dealer’s left and proceeding to the dealer, each player gets one chance to pick up the two blind cards. Only one player may pick them up; that player is the picker. The player holding the Jack of Diamonds is the picker’s partner. A picker who holds the Jack of Diamonds must go alone, and a picker may choose to go alone. If the Jack of Diamonds is in the blind, the picker may call the next Jack in the trump order. The partner is not revealed until they play the Jack of Diamonds.\n\nIf everyone passes, a doubler applies to the next deal. Doublers can stack: for example, after three consecutive all-pass deals, the next three deals are doubled. After picking, the picker buries two cards face down. Those cards count toward the picker’s team total if that team takes at least one trick.\n\nAfter the pick, eligible players may crack, indicating they believe they can defeat the picker’s team. The partner cannot crack and should wait for the picker to call them. The picker’s team may crack back. Each crack doubles the game’s cost; the page notes that a payout can reach four times the base amount. The dealer chooses last and cannot crack. Once picking and cracking are complete, play starts with the player to the dealer’s left.',
  },
  {
    title: 'The Trump',
    body: 'Trump is static. The high-trump suit order is Clubs, Spades, Hearts, Diamonds. Queens and Jacks are always trump, with Queens above Jacks; within those ranks, suits follow that order. All remaining Diamonds are also trump, for 14 trump cards total.\n\nIn the non-trump suits, the order from highest to lowest is Ace, 10, King, 9, 8, 7. The club’s page notes that a 10 beats a King.',
  },
  {
    title: 'The Game',
    body: 'With six cards per player, a hand is played over six rounds (tricks). The attacking team (picker and partner) and defending team compete for the most points; the defending team wins a tie. Card values are: Ace 11, 10 10, King 4, Queen 3, Jack 2. There are 120 points in the game. The club’s rule of thumb is that taking six point cards (Aces or 10s) should win the game.\n\nThe player who wins a round takes the cards played and their points. After all six rounds, teams count their points and pay out as follows. Values are per player; the picker-team column shows picker cost / partner cost.\n\nPicker–Defender points | Defender cost | Picker / partner cost\n120–0 | -3 | +6 / +3\n91–29 | -2 | +4 / +2\n61–59 | -1 | +2 / +1\n60–60 | +2 | -4 / -2\n30–90 | +4 | -8 / -4\n0–120 | +8 | -16 / -8\n\nDoublers and cracks multiply the listed values according to how many occurred. If the picker takes no tricks, they pay both costs. If the picker goes alone, they receive the entire picker-team payout.',
  },
  {
    title: 'Video Tutorial',
    body: '',
    videoUrl: 'https://www.youtube.com/embed/AIlFIZpev-Y?playsinline=1',
    watchUrl: 'https://www.youtube.com/watch?v=AIlFIZpev-Y',
  },
]
