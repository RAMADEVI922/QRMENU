import React, { useState, useRef } from 'react';
import { useRestaurantStore, type Table } from '@/store/restaurantStore';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download, DownloadCloud, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TableManagement() {
  const { tables, addTable, deleteTable } = useRestaurantStore();
  const [showForm, setShowForm] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber || isNaN(Number(tableNumber))) {
      toast.error('Please enter a valid table number');
      return;
    }

    const num = Number(tableNumber);
    if (tables.some((t) => t.number === num)) {
      toast.error(`Table ${num} already exists`);
      return;
    }

    setIsSaving(true);
    try {
      addTable(num);
      toast.success(`Table ${num} created successfully`);
      setTableNumber('');
      setShowForm(false);
    } catch (error) {
      toast.error('Failed to create table');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTable = (id: string, number: number) => {
    if (confirm(`Are you sure you want to delete Table ${number}?`)) {
      try {
        deleteTable(id);
        toast.success(`Table ${number} deleted`);
      } catch (error) {
        toast.error('Failed to delete table');
        console.error(error);
      }
    }
  };

  const downloadQRCode = (tableId: string, tableNumber: number) => {
    const qrElement = qrRefs.current[tableId];
    if (!qrElement) return;

    // Get SVG element
    const svg = qrElement.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas then to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `table-${tableNumber}-qr.png`;
      link.click();
      toast.success(`QR code for Table ${tableNumber} downloaded`);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const downloadAllQRCodes = async () => {
    if (tables.length === 0) {
      toast.error('No tables to download');
      return;
    }

    try {
      for (const table of tables) {
        const qrElement = qrRefs.current[table.id];
        if (!qrElement) continue;

        const svg = qrElement.querySelector('svg');
        if (!svg) continue;

        // Convert SVG to canvas then to PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `table-${table.number}-qr.png`;
          link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      toast.success(`Downloaded ${tables.length} QR codes`);
    } catch (error) {
      toast.error('Failed to download QR codes');
      console.error(error);
    }
  };

  const getQRCodeURL = (tableNumber: number) => {
    // For local development, use current origin
    // For production (GitHub Pages), use /QRMENU base path
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const baseUrl = isProduction ? window.location.origin + '/QRMENU' : window.location.origin;
    return `${baseUrl}/table-session?table=${tableNumber}`;
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <QrCode className="w-8 h-8 text-blue-500" />
            Table Management
          </h2>
          <p className="text-muted-foreground mt-1">Create tables and generate QR codes for customers to scan.</p>
        </div>

        <div className="flex items-center gap-3">
          {tables.length > 0 && (
            <Button
              onClick={downloadAllQRCodes}
              variant="outline"
              className="rounded-full shadow-md gap-2"
            >
              <DownloadCloud className="h-4 w-4" />
              Download All QR Codes
            </Button>
          )}
          <Button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Add Table Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold mb-4 text-lg">Create New Table</h3>
            <form onSubmit={handleAddTable} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Table Number</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1, 2, 3..."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  disabled={isSaving}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isSaving}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full shadow-md"
                >
                  {isSaving ? 'Creating...' : 'Create Table'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <QrCode className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <h3 className="text-xl font-bold mb-2">No tables yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Create your first table to generate QR codes for customers.
          </p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="rounded-full">
            Create First Table
          </Button>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10"
        >
          <AnimatePresence>
            {tables
              .sort((a, b) => a.number - b.number)
              .map((table) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={table.id}
                  className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col p-6"
                >
                  {/* Table Number */}
                  <div className="mb-4">
                    <div className="inline-block bg-blue-500/10 px-4 py-2 rounded-full">
                      <p className="text-sm font-bold text-blue-600">Table {table.number}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Status: <span className={table.status === 'available' ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                        {table.status === 'available' ? 'Available' : 'Occupied'}
                      </span>
                    </p>
                  </div>

                  {/* QR Code */}
                  <div
                    ref={(el) => {
                      if (el) qrRefs.current[table.id] = el;
                    }}
                    className="flex justify-center mb-6 p-4 bg-white rounded-xl"
                  >
                    <QRCodeSVG
                      value={getQRCodeURL(table.number)}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  {/* QR Code URL */}
                  <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {getQRCodeURL(table.number)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => downloadQRCode(table.id, table.number)}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => handleDeleteTable(table.id, table.number)}
                      variant="destructive"
                      size="icon"
                      className="rounded-lg h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
