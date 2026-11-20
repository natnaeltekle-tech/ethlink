import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = { isNative: true, plugin: true }
vi.mock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => native.isNative, isPluginAvailable: () => native.plugin },
}))
const Geo = { checkPermissions: vi.fn(), requestPermissions: vi.fn(), getCurrentPosition: vi.fn() }
vi.mock('@capacitor/geolocation', () => ({ Geolocation: Geo }))

const pos = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng, accuracy: 20 } })
const browserGeo = { getCurrentPosition: vi.fn() }
;(globalThis as unknown as { window: unknown }).window = globalThis
vi.stubGlobal('navigator', { geolocation: browserGeo, permissions: { query: vi.fn(async () => ({ state: 'prompt' })) } })

const { getCurrentLocation, getLocationPermission } = await import('@/lib/location')

beforeEach(() => {
    vi.clearAllMocks()
    native.isNative = true
    native.plugin = true
})

describe('Android app (Capacitor)', () => {
    it('asks Android for permission when undecided, then returns coordinates', async () => {
        Geo.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' })
        Geo.requestPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
        Geo.getCurrentPosition.mockResolvedValue(pos(9.03, 38.74))
        expect(await getCurrentLocation()).toEqual({ ok: true, lat: 9.03, lng: 38.74, accuracy: 20 })
        expect(Geo.requestPermissions).toHaveBeenCalledOnce()
        expect(Geo.getCurrentPosition).toHaveBeenCalledWith(expect.objectContaining({ enableHighAccuracy: true, timeout: 10000 }))
        expect(browserGeo.getCurrentPosition).not.toHaveBeenCalled()
    })
    it('also asks on prompt-with-rationale; approximate location is enough', async () => {
        Geo.checkPermissions.mockResolvedValue({ location: 'prompt-with-rationale', coarseLocation: 'prompt-with-rationale' })
        Geo.requestPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'granted' })
        Geo.getCurrentPosition.mockResolvedValue(pos(1, 2))
        expect((await getCurrentLocation()).ok).toBe(true)
    })
    it('falls back to low accuracy when GPS times out indoors', async () => {
        Geo.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
        Geo.getCurrentPosition.mockRejectedValueOnce(new Error('Location request timed out')).mockResolvedValueOnce(pos(5, 6))
        expect(await getCurrentLocation()).toMatchObject({ ok: true, lat: 5 })
        expect(Geo.getCurrentPosition).toHaveBeenLastCalledWith(expect.objectContaining({ enableHighAccuracy: false }))
    })
    it('"Don\'t allow" → denied (UI offers Open App Settings)', async () => {
        Geo.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' })
        Geo.requestPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' })
        expect(await getCurrentLocation()).toEqual({ ok: false, reason: 'denied' })
        expect(Geo.getCurrentPosition).not.toHaveBeenCalled()
    })
    it('never prompts when prompt:false', async () => {
        Geo.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' })
        expect((await getCurrentLocation({ prompt: false })).ok).toBe(false)
        expect(Geo.requestPermissions).not.toHaveBeenCalled()
    })
    it('device Location switch off → services_off', async () => {
        Geo.checkPermissions.mockRejectedValue(new Error('Location services are not enabled'))
        expect(await getCurrentLocation()).toEqual({ ok: false, reason: 'services_off' })
    })
    it('old APK without the plugin → app_outdated', async () => {
        native.plugin = false
        browserGeo.getCurrentPosition.mockImplementation((_ok, fail) => fail({ code: 1, message: 'denied' }))
        expect(await getCurrentLocation()).toEqual({ ok: false, reason: 'app_outdated' })
    })
    it('reads the permission without prompting', async () => {
        Geo.checkPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' })
        expect(await getLocationPermission()).toBe('denied')
    })
})

describe('mobile web', () => {
    beforeEach(() => { native.isNative = false })
    it('uses navigator.geolocation, never the native plugin', async () => {
        browserGeo.getCurrentPosition.mockImplementation((ok) => ok(pos(9, 38)))
        expect(await getCurrentLocation()).toMatchObject({ ok: true, lat: 9, lng: 38 })
        expect(Geo.checkPermissions).not.toHaveBeenCalled()
    })
    it('browser denial → denied (UI shows Safari/Chrome steps)', async () => {
        browserGeo.getCurrentPosition.mockImplementation((_ok, fail) => fail({ code: 1, message: 'User denied Geolocation' }))
        expect(await getCurrentLocation()).toEqual({ ok: false, reason: 'denied' })
    })
    it('timeout retries with low accuracy', async () => {
        browserGeo.getCurrentPosition
            .mockImplementationOnce((_ok, fail) => fail({ code: 3, message: 'Timeout expired' }))
            .mockImplementationOnce((ok) => ok(pos(7, 8)))
        expect(await getCurrentLocation()).toMatchObject({ ok: true, lat: 7 })
    })
})
