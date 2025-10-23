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

    setPrintStatus("Connecting to TM-T82X printer...")
    
    try {
      // Generate the Telegram URL for the QR code
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`
      const tableIdentifier = `table${selectedTable.replace(/\s+/g, "").toUpperCase()}`
      const telegramUrl = `https://t.me/club_krush_bot?start=${tableIdentifier}_${timestamp}`
      
      await printQRCodeToTM82X(telegramUrl, selectedTable)
      setPrintStatus("✅ QR code printed successfully!")
    } catch (error) {
      console.error("Print error:", error)
      setPrintStatus(`❌ Print failed: ${error}`)
    }
  }

  const printQRCodeToTM82X = async (data: string, tableName: string) => {
    const PRINTER_IP = '192.168.31.20'
    const PRINTER_PORT = 9100 // Standard ESC/POS port
    
    // Create ESC/POS commands for QR code printing
    const commands = new Uint8Array([
      // Initialize printer
      0x1B, 0x40, // ESC @ - Initialize printer
      
      // Set alignment to center
      0x1B, 0x61, 0x01, // ESC a 1 - Center alignment
      
      // Print header text
      ...new TextEncoder().encode(`Table ${tableName}\n`),
      ...new TextEncoder().encode(`Club Krush\n`),
      ...new TextEncoder().encode(`Scan to order\n\n`),
      
      // Set QR code size (module size = 3)
      0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x43, 0x03, // GS ( k 4 0 1 C 3
      
      // Set QR code error correction level (L = 48)
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30, // GS ( k 3 0 1 E 0
      
      // Store QR code data
      0x1D, 0x28, 0x6B, data.length + 3, 0x00, 0x31, 0x50, 0x30, // GS ( k pL pH 1 P 0
      ...new TextEncoder().encode(data),
      
      // Print QR code
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30, // GS ( k 3 0 1 Q 0
      
      // Feed paper
      0x0A, 0x0A, // LF LF - Feed 2 lines
      
      // Print footer text
      ...new TextEncoder().encode(`@club_krush_bot\n`),
      ...new TextEncoder().encode(`Thank you!\n`),
      
      // Cut paper
      0x1D, 0x56, 0x00, // GS V 0 - Full cut
    ])
    
    // Send commands to printer via WebSocket or fetch
    try {
      // Try WebSocket first (if printer supports it)
      const ws = new WebSocket(`ws://${PRINTER_IP}:${PRINTER_PORT}`)
      
      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          ws.send(commands)
          ws.close()
          resolve(true)
        }
        
        ws.onerror = (error) => {
          // Fallback to HTTP POST
          fetch(`http://${PRINTER_IP}:${PRINTER_PORT}`, {
            method: 'POST',
            body: commands,
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          })
          .then(response => {
            if (response.ok) {
              resolve(true)
            } else {
              reject(new Error(`HTTP ${response.status}`))
            }
          })
          .catch(reject)
        }
        
        setTimeout(() => {
          ws.close()
          reject(new Error('WebSocket timeout'))
        }, 5000)
      })
    } catch (error) {
      // Fallback to HTTP POST
      const response = await fetch(`http://${PRINTER_IP}:${PRINTER_PORT}`, {
        method: 'POST',
        body: commands,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    }
  }

  return (
    <>
      {/* Print styles for thermal printer */}
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
            padding: 5mm;
            text-align: center;
          }
          .print-content img {
            width: 100%;
            max-width: 60mm;
            height: auto;
          }
          .print-content h2 {
            font-size: 14px;
            margin: 5mm 0;
          }
          .print-content p {
            font-size: 10px;
            margin: 2mm 0;
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
              <h2>Table {selectedTable}</h2>
              <img
                src={qrCodeUrl}
                alt={`QR Code for ${selectedTable}`}
              />
              <p>Scan to open Telegram bot</p>
              <p>@club_krush_bot</p>
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
                  <div className="flex gap-2 w-full">
                    <Button onClick={handlePrint} className="flex-1 cursor-pointer">
                      Print
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
