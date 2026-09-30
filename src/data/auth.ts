// Sign-in settings. Players just type their name; only names listed in `admins` get the Score Ledger.
// Add or remove admins here (capitalisation, extra spaces and accents are ignored when matching).
export const authConfig = {
  admins: [
    'Mudit', 'Olivia' , 'Asher', 'Addy'
  ] as string[],
  // true: admins must also enter the admin password, which is checked by the Apps Script (set it as the
  // ADMIN_PASSWORD script property; see README). false: name only.
  requirePassword: true,
}

export const normalizeName = (n: string) =>
  n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export const isAdminName = (n: string | null | undefined) =>
  !!n && authConfig.admins.some(a => normalizeName(a) === normalizeName(n))
