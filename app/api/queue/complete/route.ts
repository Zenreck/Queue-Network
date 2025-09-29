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
    await redis.setex(`access_code:${accessCode}`, 3600, userId) // Code expires in 1 hour
    await redis.setex(`user_code:${userId}`, 3600, accessCode)

    await redis.zrem("queue", userId)
    await redis.del(`user:${userId}`)

    const nextInQueue = await redis.zrange("queue", 0, 0)

    if (nextInQueue.length > 0) {
      await redis.setex(`start_countdown:${nextInQueue[0]}`, 5, "true")
    }

    return Response.json({
      success: true,
      accessCode, // Return the access code
      nextUser: nextInQueue.length > 0 ? nextInQueue[0] : null,
    })
  } catch (error) {
    console.error("Queue complete error:", error)
    return Response.json({ error: "Failed to complete queue" }, { status: 500 })
  }
}
