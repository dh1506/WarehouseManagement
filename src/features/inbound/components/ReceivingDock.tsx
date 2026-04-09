import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface BatchItem {
  id: string;
  sku: string;
  name: string;
  image: string;
  units: number;
  addedAt: Date;
}

interface PurchaseOrder {
  poNumber: string;
  vendor: string;
  expectedUnits: number;
  receivedUnits: number;
  isAiVerified: boolean;
}

const MOCK_PO: PurchaseOrder = {
  poNumber: 'PO-88293-24',
  vendor: 'Global Logistics Partners Co.',
  expectedUnits: 1240,
  receivedUnits: 742,
  isAiVerified: true,
};

const MOCK_PRODUCTS: Record<string, Omit<BatchItem, 'id' | 'units' | 'addedAt'>> = {
  'WCU-9902-W': {
    sku: 'WCU-9902-W',
    name: 'Wireless Core Unit X2',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop&q=80',
  },
  'AHM-441-B': {
    sku: 'AHM-441-B',
    name: 'Audio Hub Module',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop&q=80',
  },
  'SEN-V4-08': {
    sku: 'SEN-V4-08',
    name: 'Sensor Array v4',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=80&h=80&fit=crop&q=80',
  },
  'CAM-X200': {
    sku: 'CAM-X200',
    name: 'HD Camera Module',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=80&h=80&fit=crop&q=80',
  },
  'PWR-HUB-3': {
    sku: 'PWR-HUB-3',
    name: 'Power Distribution Hub',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76e7e0c3?w=80&h=80&fit=crop&q=80',
  },
};

const INITIAL_BATCH: BatchItem[] = [
  {
    id: '1',
    ...MOCK_PRODUCTS['WCU-9902-W'],
    units: 24,
    addedAt: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '2',
    ...MOCK_PRODUCTS['AHM-441-B'],
    units: 12,
    addedAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '3',
    ...MOCK_PRODUCTS['SEN-V4-08'],
    units: 48,
    addedAt: new Date(Date.now() - 1000 * 60 * 2),
  },
];

const AI_TIPS: Record<string, string> = {
  'WCU-9902-W': 'This SKU usually arrives in pallets of 24. AI suggests verifying the shrink-wrap integrity before stacking.',
  'AHM-441-B': 'Audio modules from this vendor have a 2.3% defect rate. Recommend spot-checking connectors on intake.',
  'SEN-V4-08': 'This SKU usually arrives in pallets of 48. AI suggests verifying the shrink-wrap integrity of the current batch for potential moisture damage reported in Zone A-4 transit.',
  'CAM-X200': 'High fragility item. Use foam padding. Historically 94% on-time delivery from current vendor.',
  'PWR-HUB-3': 'Cross-check serial numbers against PO manifest. Last batch had 3 mismatch incidents.',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ received, total }: { received: number; total: number }) {
  const pct = Math.min((received / total) * 100, 100);
  return (
    <div className="relative w-28 h-2.5 bg-slate-200 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BatchItemCard({ item, onRemove }: { item: BatchItem; onRemove: (id: string) => void }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all group"
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-slate-50">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.sku)}&background=e2e8f0&color=94a3b8&size=80`;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
        <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-base font-extrabold text-blue-700">{item.units}</span>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">UNITS</p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 ml-1"
        title="Remove item"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReceivingDock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [scanValue, setScanValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [batch, setBatch] = useState<BatchItem[]>(INITIAL_BATCH);
  const [activeTip, setActiveTip] = useState<string | null>(AI_TIPS['SEN-V4-08']);
  const [activeTipSku, setActiveTipSku] = useState<string | null>('SEN-V4-08');
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [flashSku, setFlashSku] = useState<string | null>(null);
  const [po] = useState<PurchaseOrder>(MOCK_PO);

  // Auto-focus the scan input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const totalBatchItems = batch.reduce((sum, i) => sum + i.units, 0);
  const totalWeight = (totalBatchItems * 0.72).toFixed(2); // mock weight

  const handleAddToBatch = useCallback(() => {
    const sku = scanValue.trim().toUpperCase();
    if (!sku) {
      setScanError('Please enter or scan a SKU / serial number.');
      return;
    }

    const product = MOCK_PRODUCTS[sku];
    if (!product) {
      setScanError(`SKU "${sku}" not found in purchase order manifest.`);
      return;
    }

    setScanError(null);

    setBatch((prev) => {
      const existing = prev.find((i) => i.sku === sku);
      if (existing) {
        setFlashSku(existing.id);
        setTimeout(() => setFlashSku(null), 600);
        return prev.map((i) => (i.sku === sku ? { ...i, units: i.units + quantity } : i));
      }
      const newItem: BatchItem = {
        id: Date.now().toString(),
        ...product,
        units: quantity,
        addedAt: new Date(),
      };
      setFlashSku(newItem.id);
      setTimeout(() => setFlashSku(null), 600);
      return [...prev, newItem];
    });

    // Update AI predictive tip
    if (AI_TIPS[sku]) {
      setActiveTip(AI_TIPS[sku]);
      setActiveTipSku(sku);
    }

    toast({
      title: `Added: ${product.name}`,
      description: `${quantity} unit(s) added to current batch.`,
    });

    setScanValue('');
    setQuantity(1);
    inputRef.current?.focus();
  }, [scanValue, quantity, toast]);

  const handleRemoveItem = useCallback((id: string) => {
    setBatch((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleClearBatch = useCallback(() => {
    if (batch.length === 0) return;
    setBatch([]);
    setActiveTip(null);
    setActiveTipSku(null);
    toast({ title: 'Batch cleared', description: 'All items removed from current batch.' });
  }, [batch.length, toast]);

  const handleCompleteBatch = useCallback(async () => {
    if (batch.length === 0) return;
    setIsCompleting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setIsCompleting(false);
    toast({
      title: '✅ Batch confirmed!',
      description: `${batch.length} SKUs · ${totalBatchItems} units received into PO ${po.poNumber}.`,
    });
    navigate('/inbound');
  }, [batch.length, totalBatchItems, po.poNumber, navigate, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddToBatch();
  };

  const progressPct = Math.round((po.receivedUnits / po.expectedUnits) * 100);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inbound')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Inbound Flow
          </button>
          <span className="text-slate-200">/</span>
          <span className="text-sm font-bold text-slate-800">Receiving Dock</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            Scanner Mode
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Session
          </button>
        </div>
      </header>

      {/* ── Active Purchase Order Banner ────────────────────────────────────── */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Active Purchase Order
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">
              {po.poNumber}
            </h1>
            {po.isAiVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
                <span
                  className="material-symbols-outlined text-[12px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                AI Verified
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Vendor:{' '}
            <span className="font-semibold text-slate-700">{po.vendor}</span>
            <span className="mx-2 text-slate-200">|</span>
            Expected:{' '}
            <span className="font-semibold text-slate-700">
              {po.expectedUnits.toLocaleString()} Units
            </span>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Progress
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-teal-600">
              {po.receivedUnits.toLocaleString()}
            </span>
            <span className="text-slate-400 text-sm font-medium">
              /{po.expectedUnits.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 justify-end">
            <ProgressBar received={po.receivedUnits} total={po.expectedUnits} />
            <span className="text-xs font-bold text-slate-500">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 overflow-hidden min-h-0">
        {/* Left: Scanner Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
          {/* Scanner Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
              Scan SKU or Serial Number
            </label>

            {/* Scan Input */}
            <div
              className={`relative flex items-center rounded-xl border-2 transition-all ${
                scanError
                  ? 'border-red-300 bg-red-50'
                  : scanValue
                  ? 'border-blue-400 bg-blue-50/30'
                  : 'border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                value={scanValue}
                onChange={(e) => {
                  setScanValue(e.target.value.toUpperCase());
                  setScanError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Point scanner here..."
                className="flex-1 bg-transparent px-5 py-4 text-lg font-mono text-slate-700 placeholder:text-slate-300 placeholder:font-sans placeholder:text-base outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={handleAddToBatch}
                className="mr-3 p-2 text-slate-300 hover:text-blue-600 transition-colors"
                title="Scan barcode"
              >
                <span className="material-symbols-outlined text-[28px]">barcode_scanner</span>
              </button>
            </div>

            {/* SKU chips (quick add) */}
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.keys(MOCK_PRODUCTS).map((sku) => (
                <button
                  key={sku}
                  onClick={() => {
                    setScanValue(sku);
                    setScanError(null);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700 transition-all"
                >
                  {sku}
                </button>
              ))}
            </div>

            {scanError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                {scanError}
              </div>
            )}

            {/* Quantity Row */}
            <div className="mt-5 flex items-end gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Quantity to Receive
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors font-bold text-lg leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 h-9 text-center text-base font-bold text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors font-bold text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={handleAddToBatch}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-[0.99] active:scale-[0.97]"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                Add to Batch
              </button>
            </div>
          </div>

          {/* AI Predictive Tip */}
          {activeTip && (
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
                <span
                  className="material-symbols-outlined text-white text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lightbulb
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-sky-800 mb-1">
                  Predictive Tip
                  {activeTipSku && (
                    <span className="ml-2 font-mono text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-semibold">
                      {activeTipSku}
                    </span>
                  )}
                </p>
                <p className="text-sm text-sky-700 leading-relaxed">{activeTip}</p>
              </div>
            </div>
          )}

          {/* Scan history timeline */}
          {batch.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Scan Timeline
              </p>
              <div className="space-y-2">
                {[...batch].reverse().map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <span className="text-[10px] text-slate-400 font-mono w-14 flex-shrink-0">
                      {item.addedAt.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    <span className="font-mono text-slate-600 text-xs">{item.sku}</span>
                    <span className="text-slate-400 text-xs flex-1">{item.name}</span>
                    <span className="font-bold text-blue-700 text-xs">+{item.units}u</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Current Batch */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Batch Header */}
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800">Current Batch</h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {batch.length} items
              </span>
            </div>
            <button
              onClick={handleClearBatch}
              className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Batch Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {batch.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">
                  inventory_2
                </span>
                <p className="text-sm font-semibold text-slate-400">No items in batch</p>
                <p className="text-xs text-slate-300 mt-1">Scan a SKU to start receiving</p>
              </div>
            ) : (
              batch.map((item) => (
                <div
                  key={item.id}
                  className={`transition-all duration-300 ${
                    flashSku === item.id ? 'scale-[1.02] ring-2 ring-blue-400 ring-offset-1 rounded-xl' : ''
                  }`}
                >
                  <BatchItemCard item={item} onRemove={handleRemoveItem} />
                </div>
              ))
            )}
          </div>

          {/* Batch Footer */}
          <div className="flex-shrink-0 p-4 border-t border-slate-50 space-y-3">
            <button
              onClick={handleCompleteBatch}
              disabled={batch.length === 0 || isCompleting}
              className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-base font-bold text-white transition-all shadow-lg ${
                batch.length === 0
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-teal-300/40 hover:scale-[0.99] active:scale-[0.97]'
              }`}
            >
              {isCompleting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  Hoàn tất kiểm đếm
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
            <p className="text-xs text-center text-slate-400 font-medium">
              Confirming{' '}
              <span className="font-bold text-slate-600">{totalWeight}kg</span> total weight across{' '}
              <span className="font-bold text-slate-600">{batch.length}</span> line items
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
