import { NextResponse } from 'next/server'
import crypto from 'crypto'

function generateAuthToken(password: string): string {
  const timestamp = Date.now().toString()
  const hmac = crypto.createHmac('sha256', password).update(timestamp).digest('hex')
  return `${hmac}:${timestamp}`
}

export async function POST(request: Request) {
  const sitePassword = process.env.SITE_PASSWORD

  if (!sitePassword) {
    return NextResponse.json({ success: true })
  }

  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    // Use timing-safe comparison to prevent timing attacks
    const passwordBuffer = Buffer.from(password)
    const sitePasswordBuffer = Buffer.from(sitePassword)

    const isValid =
      passwordBuffer.length === sitePasswordBuffer.length &&
      crypto.timingSafeEqual(passwordBuffer, sitePasswordBuffer)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }

    const token = generateAuthToken(sitePassword)
    const response = NextResponse.json({ success: true })
    response.cookies.set('site_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}
