export interface Social { name: string; url: string; qrCode: string; icon: string; description: string }
// Replace url / qrCode (image path in /public) / icon (emoji or image path)
export const socials: Social[] = [
  { name: 'Instagram', url: 'https://www.instagram.com/sheepsheaduw?stkn=MW1vNjJmenVzanA4ag==', qrCode: '', icon: '\u25CE', description: 'Follow Sheepshead UW on Instagram.' },
  { name: 'Discord', url: 'https://discord.gg/n2DXm5jzZy', qrCode: '', icon: '\u2756', description: 'Join the Sheepshead UW Discord.' },
]
