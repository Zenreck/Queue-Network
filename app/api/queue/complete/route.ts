import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

function generateAccessCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    const accessCode = generateAccessCode()
    console.log("[v0] Generated access code:", accessCode, "for user:", userId)

    // Save code to Redis with 2 minute expiration
    const setResult1 = await redis.setex(`access_code:${accessCode}`, 120, userId)
    console.log("[v0] Saved access_code to Redis:", setResult1)

    const setResult2 = await redis.setex(`user_code:${userId}`, 120, accessCode)
    console.log("[v0] Saved user_code to Redis:", setResult2)

    // Verify the data was saved
    const verifyCode = await redis.get(`access_code:${accessCode}`)
    const verifyUser = await redis.get(`user_code:${userId}`)
    console.log("[v0] Verification - access_code value:", verifyCode)
    console.log("[v0] Verification - user_code value:", verifyUser)

    await redis.zrem("queue", userId)
    await redis.del(`user:${userId}`)

    const nextInQueue = await redis.zrange("queue", 0, 0)

    if (nextInQueue.length > 0) {
      await redis.setex(`start_countdown:${nextInQueue[0]}`, 5, "true")
    }

    return Response.json({
      success: true,
      accessCode,
      nextUser: nextInQueue.length > 0 ? nextInQueue[0] : null,
    })
  } catch (error) {
    console.error("[v0] Queue complete error:", error)
    return Response.json({ error: "Failed to complete queue" }, { status: 500 })
  }
}
