import { SERVICE_CATEGORIES } from '@/lib/service-filters'

/**
 * Words the assistant understands without AI, in English and Amharic.
 * Listings are written in English, so Amharic words map to English search terms.
 * Categories must match SERVICE_CATEGORIES (the categories listings actually use).
 */
export type Category = (typeof SERVICE_CATEGORIES)[number]
export const CATEGORIES: readonly string[] = SERVICE_CATEGORIES

/** English keyword → category. Keywords also become search terms. */
export const KEYWORD_CATEGORY: Record<string, Category> = {
    // Cleaning
    clean: 'Cleaning', cleaning: 'Cleaning', cleaner: 'Cleaning', maid: 'Cleaning', housekeeping: 'Cleaning', laundry: 'Cleaning',
    // Home services
    plumber: 'Home Services', plumbing: 'Home Services', electrician: 'Home Services', electric: 'Home Services',
    repair: 'Home Services', fix: 'Home Services', handyman: 'Home Services', carpenter: 'Home Services',
    painting: 'Home Services', painter: 'Home Services', maintenance: 'Home Services', gardening: 'Home Services', gardener: 'Home Services',
    // Transport
    taxi: 'Transport', ride: 'Transport', car: 'Transport', bus: 'Transport', driver: 'Transport', transport: 'Transport',
    shuttle: 'Transport', airport: 'Transport', pickup: 'Transport', delivery: 'Transport', moving: 'Transport', truck: 'Transport',
    // Hospitality
    hotel: 'Hospitality', room: 'Hospitality', stay: 'Hospitality', guesthouse: 'Hospitality', lodge: 'Hospitality',
    bnb: 'Hospitality', accommodation: 'Hospitality', restaurant: 'Hospitality', cafe: 'Hospitality', food: 'Hospitality',
    // Events
    wedding: 'Events', party: 'Events', event: 'Events', birthday: 'Events', decoration: 'Events', photographer: 'Events',
    photography: 'Events', photo: 'Events', catering: 'Events', dj: 'Events', music: 'Events', venue: 'Events',
    // Real estate
    rent: 'Real Estate', apartment: 'Real Estate', house: 'Real Estate', land: 'Real Estate', villa: 'Real Estate',
    condominium: 'Real Estate', condo: 'Real Estate',
    // Professional services
    lawyer: 'Professional Services', accountant: 'Professional Services', consulting: 'Professional Services',
    tutor: 'Professional Services', teacher: 'Professional Services', translator: 'Professional Services',
    design: 'Professional Services', marketing: 'Professional Services',
    // Tech
    computer: 'Tech', laptop: 'Tech', website: 'Tech', developer: 'Tech', software: 'Tech', phone: 'Tech',
}

/** Amharic (Ge'ez script) → English search term. Longest phrases are matched first. */
export const AMHARIC_TERMS: Record<string, string> = {
    'ቧንቧ': 'plumber', 'ቧምቧ': 'plumber', 'ኤሌክትሪክ': 'electrician', 'ኤሌትሪክ': 'electrician', 'ጥገና': 'repair',
    'አናጢ': 'carpenter', 'ቀለም': 'painting', 'ጽዳት': 'cleaning', 'ፅዳት': 'cleaning', 'ልብስ ማጠብ': 'laundry',
    'ታክሲ': 'taxi', 'መኪና': 'car', 'አውቶቡስ': 'bus', 'ሹፌር': 'driver', 'ትራንስፖርት': 'transport', 'እቃ ማጓጓዝ': 'moving',
    'ሆቴል': 'hotel', 'ክፍል': 'room', 'እንግዳ ማረፊያ': 'guesthouse', 'ማረፊያ': 'accommodation', 'ምግብ ቤት': 'restaurant', 'ምግብ': 'food',
    'ሰርግ': 'wedding', 'ልደት': 'birthday', 'ፓርቲ': 'party', 'ፎቶግራፍ': 'photography', 'ፎቶ': 'photography', 'ዲኮር': 'decoration', 'ጌጥ': 'decoration',
    'ኪራይ': 'rent', 'አፓርታማ': 'apartment', 'ኮንዶሚኒየም': 'condominium', 'ቤት': 'house', 'መሬት': 'land',
    'ጠበቃ': 'lawyer', 'ሂሳብ ሰራተኛ': 'accountant', 'አስጠኚ': 'tutor', 'አስተማሪ': 'teacher', 'ተርጓሚ': 'translator',
    'ኮምፒውተር': 'computer', 'ስልክ': 'phone', 'ፀጉር': 'hair', 'ጸጉር': 'hair', 'ውበት': 'beauty',
}

/** Amharic price/sort words. */
export const AMHARIC_CHEAP = ['ርካሽ', 'ዋጋው ዝቅተኛ', 'ቅናሽ']
export const AMHARIC_BEST = ['ምርጥ', 'ጥሩ']

/** Places customers name, in both scripts → the Latin spelling used on listings. */
export const PLACES: Record<string, string> = {
    'አዲስ አበባ': 'Addis Ababa', 'ቦሌ': 'Bole', 'ፒያሳ': 'Piassa', 'መርካቶ': 'Merkato', 'ሲኤምሲ': 'CMC', 'ካዛንቺስ': 'Kazanchis',
    'መገናኛ': 'Megenagna', 'ሳሪስ': 'Saris', 'አያት': 'Ayat', 'ጀሞ': 'Jemo', 'ቃሊቲ': 'Kality', 'ሰሚት': 'Summit', 'ሃያሁለት': 'Hayahulet',
    'ጎሮ': 'Goro', 'ለገሃር': 'Legehar', 'ሳርቤት': 'Sarbet', 'ሜክሲኮ': 'Mexico', 'ልደታ': 'Lideta', 'አዳማ': 'Adama', 'ሀዋሳ': 'Hawassa',
    'ሐዋሳ': 'Hawassa', 'ባህር ዳር': 'Bahir Dar', 'ጎንደር': 'Gondar', 'መቀሌ': 'Mekelle', 'ድሬዳዋ': 'Dire Dawa',
    'addis ababa': 'Addis Ababa', addis: 'Addis Ababa', bole: 'Bole', piassa: 'Piassa', piazza: 'Piassa', merkato: 'Merkato', cmc: 'CMC',
    kazanchis: 'Kazanchis', megenagna: 'Megenagna', saris: 'Saris', ayat: 'Ayat', jemo: 'Jemo', kality: 'Kality', summit: 'Summit',
    hayahulet: 'Hayahulet', goro: 'Goro', legehar: 'Legehar', sarbet: 'Sarbet', mexico: 'Mexico', lideta: 'Lideta', adama: 'Adama',
    hawassa: 'Hawassa', 'bahir dar': 'Bahir Dar', gondar: 'Gondar', mekelle: 'Mekelle', 'dire dawa': 'Dire Dawa',
}

const ETHIOPIC = /[ሀ-፿]/

export function isAmharic(text: string): boolean {
    return ETHIOPIC.test(text)
}
