// READ-ONLY EXCERPT (first lines) from casher@1fcb9e25f8c865771e2d973427311c13251a6c72 — not full file

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle2, ChevronLeft, Clock3, Monitor, Printer,
  RefreshCw, Scissors, ShieldCheck, TestTube2, Wifi, WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PrintRecoveryCenter from '@/components/printing/PrintRecoveryCenter';
import PrintAgentInstallerDownload from '@/components/printing/PrintAgentInstallerDownload';
import { Switch } from '@/components/ui/switch';
import {
  getLocalPrinterSettings, patchLocalPrinterSettings, printLocalTestReceipt,
  getLocalAgentHealth, getLocalPrinterDiagnostics, getLoopbackPermissionState, REQUIRED_AGENT_VERSION,
  hasUsablePrintSettings,
  type LocalPrinterSettings, type ReceiptType, type PrinterDiagnostics, type LoopbackPermissionState,
} from '@/lib/localPrintClient';

const RECEIPTS: Array<{ key: ReceiptType; title: string; subtitle: string }> = [
  { key: 'invoice', title: '┘ü┘ê╪º╪¬┘è╪▒ ╪º┘ä┘à╪¿┘è╪╣╪º╪¬', subtitle: '╪╖╪¿╪º╪╣╪⌐ ┘ü┘ê╪º╪¬┘è╪▒ ┘å┘é╪º╪╖ ╪º┘ä╪¿┘è╪╣' },
  { key: 'expense', title: '╪Ñ┘è╪╡╪º┘ä╪º╪¬ ╪º┘ä┘à╪╡╪▒┘ê┘ü╪º╪¬', subtitle: '╪╖╪¿╪º╪╣╪⌐ ╪Ñ┘è╪╡╪º┘ä╪º╪¬ ╪¬╪│╪¼┘è┘ä ╪º┘ä┘à╪╡╪▒┘ê┘ü╪º╪¬' },
  { key: 'deduction', title: '╪Ñ┘è╪╡╪º┘ä╪º╪¬ ╪º┘ä╪«╪╡┘ê┘à╪º╪¬ ┘ê╪º┘ä╪│┘ä┘ü', subtitle: '╪º┘ä╪Ñ┘è╪╡╪º┘ä╪º╪¬ ╪º┘ä┘à╪▒╪│┘ä╪⌐ ┘à┘å ╪┤╪º╪┤╪⌐ ╪º┘ä╪«╪╡┘ê┘à╪º╪¬' },
  { key: 'other', title: '╪Ñ┘è╪╡╪º┘ä╪º╪¬ ╪ú╪«╪▒┘ë ┘ê╪º╪«╪¬╪¿╪º╪▒ ╪º┘ä╪╖╪º╪¿╪╣╪⌐', subtitle: '╪ú┘è ┘å┘ê╪╣ ╪╖╪¿╪º╪╣╪⌐ ╪¼╪»┘è╪» ╪║┘è╪▒ ┘à╪╡┘å┘ü ╪¡╪¬┘ë ╪º┘ä╪ó┘å' },
];

function SettingRow({
  label, detail, checked, disabled, onChange,
}: { label: string; detail: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export default function PrinterControlPage() {
  const [settings, setSettings] = useState<LocalPrinterSettings | null>(null);
  const [connected, setConnected] = useState(false);
  const [permission, setPermission] = useState<LoopbackPermissionState>('unsupported');
  const [attempted, setAttempted] = useState(false);
  const [healthVersion, setHealthVersion] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<PrinterDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async (quiet = false) => {
    if (busyRef.current) return;
    if (!quiet) { setLoading(true); setAttempted(true); }
    try {
      const data = await getLocalPrinterSettings();
      // Preserve functioning V1 devices while rolling out V2 one cashier PC at a time.
      // Only use the legacy agent when the existing settings endpoint has expected controls.
      if (!hasUsablePrintSettings(data)) throw new Error('Unsupported local Agent settings');
      setSettings(data);
      setConnected(true);
      setHealthVersion(data.version || 'legacy');
      if (!quiet) setError(null);
      if (data.version === REQUIRED_AGENT_VERSION) {
        try { setDiagnostics(await getLocalPrinterDiagnostics()); }
        catch { setDiagnostics(null); }
      } else {
        setDiagnostics(null); // V1 has no /diagnostics endpoint.
      }
    } catch {
      setConnected(false);
      setHealthVersion(null);
      setSettings(null);
      setDiagnostics(null);
      if (!quiet) {
        let message = '╪¬╪╣╪░╪▒ ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä┘Ç Agent╪¢ ╪º┘ü╪¬╪¡ ╪▒╪º╪¿╪╖ /health ┘ä┘à╪╣╪▒┘ü╪⌐ ╪Ñ╪░╪º ┘â╪º┘å╪¬ ╪º┘ä╪«╪»┘à╪⌐ ┘à╪¬┘ê┘é┘ü╪⌐ ╪ú┘ê Chrome ┘à┘å╪╣ ╪º┘ä╪º╪¬╪╡╪º┘ä.';
        try {
          const health = await getLocalAgentHealth();
          setHealthVersion(health.version || 'unknown');
          message = health.version !== REQUIRED_AGENT_VERSION
            ? `┘å╪│╪«╪⌐ ╪º┘ä╪╖╪¿╪º╪╣╪⌐ ┘é╪»┘è┘à╪⌐ (${health.version || '╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü╪⌐'}). ╪┤╪║┘æ┘ä ╪ú╪»╪º╪⌐ Repair V2 ╪╣┘ä┘ë ╪¼┘ç╪º╪▓ ╪º┘ä┘â╪º╪┤┘è╪▒.`
            : '╪º┘ä┘Ç Agent ╪┤╪║╪º┘ä ┘ä┘â┘å ╪Ñ╪╣╪»╪º╪»╪º╪¬┘ç ╪║┘è╪▒ ┘à╪¬╪º╪¡╪⌐. ╪┤╪║┘æ┘ä ╪ú╪»╪º╪⌐ Repair V2 ┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪¬╪½╪¿┘è╪¬.';
        } catch { /* Browser errors cannot reliably distinguish offline, CORS, and LNA. */ }
        setError(message);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void getLoopbackPermissionState().then(state => {
      if (!active) return;
      setPermission(state);
      if (state === 'granted') void refresh();
      else setLoading(false); // Initial permission prompt only after explicit user click.
    });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => void refresh(true), 10000);
    return () => clearInterval(timer);
  }, [connected, refresh]);

  const change = async (patch: { enabled?: boolean; autoCut?: boolean; types?: Partial<LocalPrinterSettings['types']> }) => {
    if (busyRef.current || !settings) return;
    busyRef.current = true;
    setSaving(true);
    setNotice(null);
    setError(null);
