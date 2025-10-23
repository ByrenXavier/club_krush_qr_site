const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = 3001; // Local server port

// Enable CORS for all origins (so Vercel can call it)
app.use(cors());
app.use(express.json());

// Printer configuration
const PRINTER_IP = '192.168.31.20';
const PRINTER_PORT = 9100;

// Function to send ESC/POS commands to printer
function sendToPrinter(data, tableName) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    // Create ESC/POS commands for QR code printing (based on TM-T82X technical reference)
    const commands = Buffer.concat([
      // Initialize printer
      Buffer.from([0x1B, 0x40]), // ESC @
      
      // Set alignment to center
      Buffer.from([0x1B, 0x61, 0x01]), // ESC a 1
      
      // Print header text
      Buffer.from(`Club Krush\n`, 'utf8'),
      Buffer.from(`Table ${tableName}\n`, 'utf8'),
      Buffer.from(`Scan to order\n\n`, 'utf8'),
      
      // Set QR code model (Model 2)
      Buffer.from([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]), // GS ( k 4 0 1 A 2 0
      
      // Set QR code size (module size = 8)
      Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08]), // GS ( k 3 0 1 C 8
      
      // Set QR code error correction level (L = 48)
      Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30]), // GS ( k 3 0 1 E 0
      
      // Store QR code data
      Buffer.concat([
        Buffer.from([0x1D, 0x28, 0x6B]), // GS ( k
        Buffer.from([data.length + 3, 0x00]), // pL pH
        Buffer.from([0x31, 0x50, 0x30]), // 1 P 0
        Buffer.from(data, 'utf8')
      ]),
      
      // Print QR code
      Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]), // GS ( k 3 0 1 Q 0
      
      // Feed paper
      Buffer.from([0x0A, 0x0A]), // LF LF
      
      // Print footer text
      Buffer.from(`@club_krush_bot\n`, 'utf8'),
      Buffer.from(`Thank you for dining with us!\n`, 'utf8'),
      
      // Cut paper
      Buffer.from([0x1D, 0x56, 0x00]) // GS V 0
    ]);

    console.log(`Connecting to printer at ${PRINTER_IP}:${PRINTER_PORT}`);
    
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log('Connected to printer, sending commands...');
      client.write(commands);
      client.end();
      resolve('Print job sent successfully');
    });

    client.on('error', (err) => {
      console.error('Printer connection error:', err);
      reject(err);
    });

    client.on('close', () => {
      console.log('Connection to printer closed');
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      client.destroy();
      reject(new Error('Connection timeout'));
    }, 10000);
  });
}

// API endpoint to print QR code
app.post('/print-qr', async (req, res) => {
  try {
    const { data, tableName } = req.body;
    
    if (!data || !tableName) {
      return res.status(400).json({ error: 'Missing data or tableName' });
    }

    console.log(`Print request: Table ${tableName}, Data: ${data}`);
    await sendToPrinter(data, tableName);
    res.json({ success: true, message: 'QR code printed successfully' });
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Print relay server is running',
    printer: `${PRINTER_IP}:${PRINTER_PORT}`
  });
});

// Test endpoint to check printer connection
app.get('/test-printer', async (req, res) => {
  try {
    await sendToPrinter('https://t.me/club_krush_bot', 'TEST');
    res.json({ success: true, message: 'Test print sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Print relay server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Printer configured for: ${PRINTER_IP}:${PRINTER_PORT}`);
  console.log(`🌐 Accessible from: http://[YOUR_LOCAL_IP]:${PORT}`);
  console.log(`📱 Test endpoint: http://[YOUR_LOCAL_IP]:${PORT}/test-printer`);
});
