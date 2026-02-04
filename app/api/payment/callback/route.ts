import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONFIG } from '@/lib/constants'

export async function POST(request: NextRequest) {
    try {
        // Parse incoming JSON body from payment provider
        const body = await request.json()

        // TODO: Production signature verification
        // In production, verify the webhook signature using the payment provider's secret key
        // Example: const signature = request.headers.get('x-signature')
        // if (!verifySignature(body, signature)) {
        //     return NextResponse.json({ code: 1, msg: 'Invalid signature' }, { status: 401 })
        // }

        // Extract booking ID from payload
        // Adjust field name based on your payment provider's response format
        const bookingId = body.outTradeNo || body.booking_id || body.reference

        if (!bookingId) {
            return NextResponse.json(
                { code: 1, msg: 'Missing booking ID' },
                { status: 400 }
            )
        }

        // Use admin client to bypass RLS
        const adminSupabase = createAdminClient()

        // Fetch booking details to get price and user_id
        const { data: booking, error: fetchError } = await adminSupabase
            .from('bookings')
            .select('*, services(price)')
            .eq('id', bookingId)
            .single()

        if (fetchError || !booking) {
            return NextResponse.json(
                { code: 1, msg: 'Booking not found' },
                { status: 404 }
            )
        }

        // Calculate commission and provider earnings
        const price = booking.services.price
        const commission = price * CONFIG.COMMISSION_RATE
        const earnings = price - commission

        // Update booking status to 'paid' and store commission details
        const { error: updateError } = await adminSupabase
            .from('bookings')
            .update({
                status: 'paid',
                commission_amount: commission,
                provider_earnings: earnings
            })
            .eq('id', bookingId)

        if (updateError) {
            return NextResponse.json(
                { code: 1, msg: 'Failed to update booking' },
                { status: 500 }
            )
        }

        // Send notification to user
        await adminSupabase
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                content: 'Payment Received',
                type: 'payment',
                link: '/dashboard'
            })

        // Return success response
        return NextResponse.json({ code: 0, msg: 'success' })

    } catch (error) {
        console.error('Payment callback error:', error)
        return NextResponse.json(
            { code: 1, msg: 'Internal server error' },
            { status: 500 }
        )
    }
}
