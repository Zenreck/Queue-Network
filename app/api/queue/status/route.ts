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

    // Clean up expired users first
    const now = Date.now()
    const expiredThreshold = now - 35000 // 35 seconds ago

    // Get all queue members
    const queueMembers = await redis.zrange("queue", 0, -1, { withScores: true })

    // Remove expired users
    for (let i = 0; i < queueMembers.length; i += 2) {
      const member = queueMembers[i] as string
      const score = queueMembers[i + 1] as number

      if (score < expiredThreshold) {
        await redis.zrem("queue", member)
        await redis.del(`user:${member}`)
      }
    }

    // Update user's heartbeat
    await redis.setex(`user:${userId}`, 30, now.toString())

    // Get current position and total
    const queuePosition = await redis.zrank("queue", userId)
    const totalInQueue = await redis.zcard("queue")

    // Check if user is first in queue
    const isFirst = queuePosition === 0

    return Response.json({
      success: true,
      position: queuePosition !== null ? queuePosition + 1 : null,
      totalInQueue,
      isFirst,
      canProceed: isFirst,
    })
  } catch (error) {
    console.error("Queue status error:", error)
    return Response.json({ error: "Failed to get queue status" }, { status: 500 })
  }
}
