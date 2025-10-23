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
  const [printStatus, setPrintStatus] = useState<string>("")

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
    setPrintStatus("")
  }


  const handlePrint = async () => {
    console.log("[v0] Print button clicked for Table", selectedTable)
    if (!qrCodeUrl) return

    setPrintStatus("Opening print dialog...")
    
    // Use browser print dialog - user selects TM-T82X from printer list
    // This is the recommended approach for iPad + Vercel deployment
    window.print()
    
    setPrintStatus("Print dialog opened - select your TM-T82X printer")
  }

  const handleDirectPrint = async () => {
    console.log("[v0] Direct print button clicked for Table", selectedTable)
    if (!qrCodeUrl) return

    setPrintStatus("Sending to print relay server...")
    
    try {
      // Generate the Telegram URL for the QR code
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`
      const tableIdentifier = `table${selectedTable.replace(/\s+/g, "").toUpperCase()}`
      const telegramUrl = `https://t.me/club_krush_bot?start=${tableIdentifier}_${timestamp}`
      
      await printQRCodeViaRelay(telegramUrl, selectedTable)
      setPrintStatus("✅ QR code printed successfully!")
    } catch (error) {
      console.error("Direct print error:", error)
      setPrintStatus(`❌ Print failed: ${error}. Make sure the print relay server is running.`)
    }
  }

  const printQRCodeViaRelay = async (data: string, tableName: string) => {
    // Get the local IP address of the device running the relay server
    // You'll need to replace this with your actual local IP
    const RELAY_SERVER_IP = '192.168.31.1' // Replace with your computer's IP
    const RELAY_SERVER_PORT = 3001
    
    const response = await fetch(`http://${RELAY_SERVER_IP}:${RELAY_SERVER_PORT}/print-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: data,
        tableName: tableName
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }
    
    const result = await response.json()
    return result
  }

  return (
    <>
      {/* Print styles optimized for TM-T82X thermal printer */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 2mm;
            text-align: center;
            font-family: monospace;
            background: white;
          }
          .print-content h2 {
            font-size: 16px;
            font-weight: bold;
            margin: 3mm 0;
            text-transform: uppercase;
          }
          .print-content h3 {
            font-size: 14px;
            font-weight: bold;
            margin: 2mm 0;
          }
          .print-content img {
            width: 100%;
            max-width: 50mm;
            height: auto;
            margin: 2mm 0;
          }
          .print-content p {
            font-size: 12px;
            margin: 1mm 0;
            line-height: 1.2;
          }
          .print-content .footer {
            margin-top: 3mm;
            font-size: 10px;
            color: #666;
          }
        }
      `}</style>
      
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
          <>
            {/* Hidden print content */}
            <div className="print-content" style={{ display: 'none' }}>
              <h2>Club Krush</h2>
              <h3>Table {selectedTable}</h3>
              <p>Scan to order</p>
              <img
                src={qrCodeUrl}
                alt={`QR Code for ${selectedTable}`}
              />
              <p>@club_krush_bot</p>
              <div className="footer">
                <p>Thank you for dining with us!</p>
              </div>
            </div>
            
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
                  {printStatus && (
                    <p className="text-sm text-center text-muted-foreground">{printStatus}</p>
                  )}
                  <div className="text-xs text-muted-foreground text-center space-y-1">
                    <p><strong>Print (Recommended):</strong> Uses iPad's print dialog</p>
                    <p><strong>Direct Print:</strong> Uses print relay server (requires setup)</p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button onClick={handlePrint} className="flex-1 cursor-pointer">
                      Print (Recommended)
                    </Button>
                    <Button onClick={handleDirectPrint} variant="outline" className="flex-1 cursor-pointer">
                      Direct Print
                    </Button>
                    <Button onClick={closeQRCode} variant="outline" className="flex-1 bg-transparent cursor-pointer">
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
    </>
  )
}
