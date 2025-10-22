import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = "48f3eaa664264362a2e8291a42fd2480"
    const apiSecret = "4aec87fc2c1841a6b535e15a0bc667315d841227a3c24299b5429119f8ae2fc2"

    const response = await fetch(`https://krush.revelup.com/resources/Table/`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "API-AUTHENTICATION": `${apiKey}:${apiSecret}`,
      },
    })

    if (!response.ok) {
      console.error("[v0] API request failed with status", response.status)
      const errorText = await response.text()
      console.error("[v0] Error response:", errorText)
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()

    const tableList = data.objects || []

    return NextResponse.json({ tables: tableList })
  } catch (error) {
    console.error("[v0] Error fetching tables from Revel:", error)
    return NextResponse.json({ error: "Failed to fetch tables from Revel" }, { status: 500 })
  }
}
