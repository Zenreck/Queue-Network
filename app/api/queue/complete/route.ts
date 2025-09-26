import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    await redis.zrem("queue", userId)
    await redis.del(`user:${userId}`)

    const nextInQueue = await redis.zrange("queue", 0, 0)

    if (nextInQueue.length > 0) {
      await redis.setex(`start_countdown:${nextInQueue[0]}`, 5, "true")
    }

    return Response.json({
      success: true,
      nextUser: nextInQueue.length > 0 ? nextInQueue[0] : null,
    })
  } catch (error) {
    console.error("Queue complete error:", error)
    return Response.json({ error: "Failed to complete queue" }, { status: 500 })
  }
}
