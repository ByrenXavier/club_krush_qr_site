"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import QRCode from "qrcode"

interface RevelTable {
  id: number
  name: string
  // Add other fields from Revel API as needed
}

export default function TableQRGenerator() {
  const [tables, setTables] = useState<RevelTable[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")

  const fetchTables = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/tables")

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      console.log("[v0] Fetched tables:", data.tables)
      setTables(data.tables)
    } catch (err) {
      console.error("[v0] Error fetching tables:", err)
      setError("Unable to load tables from Revel.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [])

  const generateQRCode = async (tableName: string) => {
    setSelectedTable(tableName)

    // Generate timestamp in the format: 2025-10-20_19-34-52
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`

    const tableIdentifier = `table${tableName.replace(/\s+/g, "").toUpperCase()}`
    const payload = `/start ${tableIdentifier}_${timestamp}`
    const telegramUrl = `https://t.me/club_krush_bot?start=${tableIdentifier}_${timestamp}`

    try {
      // Generate QR code
      const qrUrl = await QRCode.toDataURL(telegramUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error("[v0] Error generating QR code:", error)
    }
  }

  const closeQRCode = () => {
    setSelectedTable(null)
    setQrCodeUrl("")
  }

  const handlePrint = async () => {
    // TODO: Implement Epson T82X printer integration
    // This function will connect to the Epson T82X thermal printer
    // and send the QR code image for printing

    console.log("[v0] Print button clicked for Table", selectedTable)
    console.log("[v0] QR Code URL:", qrCodeUrl)

    // Placeholder for Epson T82X printer commands
    // Will implement ESC/POS commands or Epson SDK integration here
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Table Selection</h1>
          <p className="text-muted-foreground">Click on a table to generate a QR code for your Telegram bot</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tables from Revel...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchTables} className="mt-4">
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && tables.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {tables.map((table) => (
              <Card
                key={table.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                onClick={() => generateQRCode(table.name)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-2xl">{table.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">Click to generate QR</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && tables.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tables found in Revel.</p>
          </div>
        )}

        {/* QR Code Display */}
        {selectedTable && qrCodeUrl && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={closeQRCode}>
            <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="text-center">{selectedTable}</CardTitle>
                <CardDescription className="text-center">Scan this QR code to open the Telegram bot</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCodeUrl || "/placeholder.svg"}
                    alt={`QR Code for ${selectedTable}`}
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all">@club_krush_bot</p>
                <div className="flex gap-2 w-full">
                  <Button onClick={handlePrint} className="flex-1">
                    Print
                  </Button>
                  <Button onClick={closeQRCode} variant="outline" className="flex-1 bg-transparent">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
