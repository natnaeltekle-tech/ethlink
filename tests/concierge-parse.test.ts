import { describe, expect, it } from 'vitest'
import { parseLocally } from '@/lib/concierge/parse'

describe('parseLocally (no AI)', () => {
    it('English: service + place + budget', () => {
        const c = parseLocally('I need a cheap plumber in Bole under 800 birr')
        expect(c).toMatchObject({ intent: 'search', lang: 'en', category: 'Home Services', location: 'Bole', maxPrice: 800, sort: 'price_asc' })
        expect(c.terms).toContain('plumber')
        expect(c.terms).not.toContain('bole')
    })
    it('Amharic: translates the service and the place', () => {
        const c = parseLocally('ቦሌ አካባቢ የቧንቧ ሰራተኛ እፈልጋለሁ')
        expect(c).toMatchObject({ intent: 'search', lang: 'am', location: 'Bole', category: 'Home Services' })
        expect(c.terms).toContain('plumber')
    })
    it('Amharic: cleaning, hotel, taxi, wedding photos', () => {
        expect(parseLocally('ጽዳት').category).toBe('Cleaning')
        expect(parseLocally('ሆቴል አዲስ አበባ')).toMatchObject({ category: 'Hospitality', location: 'Addis Ababa' })
        expect(parseLocally('ርካሽ ታክሲ')).toMatchObject({ category: 'Transport', sort: 'price_asc' })
        expect(parseLocally('የሰርግ ፎቶግራፍ').terms).toEqual(expect.arrayContaining(['wedding', 'photography']))
    })
    it('mixed script and known places without "in"', () => {
        const c = parseLocally('taxi ወደ ቦሌ')
        expect(c).toMatchObject({ category: 'Transport', location: 'Bole', lang: 'am' })
    })
    it('"best" sorts by rating, "luxury" by price high→low', () => {
        expect(parseLocally('best hotel in Hawassa')).toMatchObject({ sort: 'rating', location: 'Hawassa' })
        expect(parseLocally('luxury car')).toMatchObject({ sort: 'price_desc', category: 'Transport' })
    })
    it('greetings and questions are not searches', () => {
        expect(parseLocally('hi').intent).toBe('greeting')
        expect(parseLocally('ሰላም').intent).toBe('greeting')
        expect(parseLocally('How does escrow payment work?').intent).toBe('question')
        expect(parseLocally('ክፍያ እንዴት ነው?').intent).toBe('question')
    })
    it('a question that names a service is still a search', () => {
        expect(parseLocally('how much is cleaning in CMC?')).toMatchObject({ intent: 'search', category: 'Cleaning', location: 'CMC' })
    })
})
