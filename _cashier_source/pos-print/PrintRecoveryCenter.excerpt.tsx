// READ-ONLY EXCERPT (first lines) from casher@46cf0911e5f88311541828b250d0d0c34b78c16d — not full file
'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCopy, Download, ExternalLink, RefreshCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPrintRecoveryPlan, type RecoveryContext } from '@/lib/printRecoveryPlan';
import { PRINT_SERVICE_URL } from '@/lib/localPrintClient';

type Props = RecoveryContext & {
  busy: boolean;
  onCheck: () => void;
  onEnable: () => void;
  onEnableTest: () => void;
  onTest: () => void;
};

const CHECKER = '/downloads/Check-CUT-Print-Agent.ps1';
const REPAIR = '/downloads/Install-CUT-Print-Agent.ps1';
const BROWSER_REPAIR = '/downloads/Repair-CUT-Print-Chrome.cmd';

/**
 * Guided recovery only: network checks are read-only.
 * The browser cannot install apps, restart Windows tasks or verify physical paper.
 */
export default function PrintRecoveryCenter(props: Props) {
  const step = buildPrintRecoveryPlan(props)[0];
  const ok = step.kind === 'ready';
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copyReport() {
    // Support snapshot only: no HTML, invoice details, customer data, IP or raw logs.
    const report = {
      issue: step.kind, level: step.level,
      chromeLoopbackPermission: props.permission,
      agentReachable: props.connected,
      agentVersion: props.healthVersion || 'unknown',
      printPolicyEnabled: props.settings?.enabled ?? null,
      engine: props.settings?.engine ?? null,
      diagnosticsAvailable: props.diagnostics?.probe || null,
      printerFound: props.diagnostics?.printerFound ?? null,
      chromeRendererFound: props.diagnostics?.browserFound ?? null,
      printerStatus: props.diagnostics?.printerStatus || null,
      spoolerStatus: props.diagnostics?.spoolerStatus || null,
      queuedJobs: props.diagnostics?.queuedJobs ?? null,
      paperConfirmed: false,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopyState('copied');
    } catch { setCopyState('failed'); }
  }
  return (
    <section dir="rtl" data-testid="print-recovery-center" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
        <h2 className="text-base font-bold">┘à╪▒┘â╪▓ ╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪╖╪¿╪º╪╣╪⌐</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        ╪¬╪┤╪«┘è╪╡ ┘à╪¬╪»╪▒┘æ╪¼╪î ╪«╪╖┘ê╪⌐ ┘ê╪º╪¡╪»╪⌐ ┘à┘å╪º╪│╪¿╪⌐ ┘ä┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐. ╪º┘ä┘ü╪¡╪╡ ┘à╪┤ ╪¿┘è╪╖╪¿╪╣╪î ┘ê┘à┘ü┘è╪┤ ╪Ñ╪╣╪º╪»╪⌐ ╪╖╪¿╪º╪╣╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪⌐.
      </p>
      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">╪º┘ä┘à╪│╪¬┘ê┘ë {step.level} ┘à┘å 5</p>
        <h3 className="mt-1 text-sm font-bold">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed">{step.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(step.action === 'check' || step.action === 'permissions') && (
            <Button onClick={props.onCheck} disabled={props.busy}>
              <RefreshCcw className="h-4 w-4" /> ┘ü╪¡╪╡ ╪º┘ä╪º╪¬╪╡╪º┘ä
            </Button>
          )}
          {step.action === 'enable' && (
            <Button onClick={props.onEnable} disabled={props.busy}>╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪¿╪º╪╣╪⌐</Button>
          )}
          {step.action === 'test' && props.settings?.types.other === false && (
            <Button onClick={props.onEnableTest} disabled={props.busy}>╪¬┘ü╪╣┘è┘ä ╪Ñ┘è╪╡╪º┘ä╪º╪¬ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒</Button>
          )}
          {step.action === 'test' && props.settings?.types.other !== false && (
            <Button onClick={props.onTest} disabled={props.busy}>╪Ñ╪▒╪│╪º┘ä ┘ê╪▒┘é╪⌐ ╪º╪«╪¬╪¿╪º╪▒ ┘ê╪º╪¡╪»╪⌐</Button>
          )}
          {step.action === 'repair-browser' && (
            <a href={BROWSER_REPAIR} download="Repair-CUT-Print-Chrome.cmd"
              data-testid="repair-puppeteer-chrome"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background">
              <Download className="h-4 w-4" /> ╪¬┘å╪▓┘è┘ä ╪Ñ╪╡┘ä╪º╪¡ Chrome ┘ä┘ä╪╖╪¿╪º╪╣╪⌐ (Windows)
            </a>
          )}
          {step.action === 'local-check' && (
            <a href={CHECKER} download="Check-CUT-Print-Agent.ps1"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background">
              <Download className="h-4 w-4" /> ╪¬┘å╪▓┘è┘ä ┘ü╪¡╪╡ ┘ê╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪¬╪┤╪║┘è┘ä
            </a>
          )}
          {step.action === 'upgrade' && (
            <a href={REPAIR} download="Install-CUT-Print-Agent.ps1"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background">
              <Download className="h-4 w-4" /> ╪¬┘å╪▓┘è┘ä ╪¬╪¡╪»┘è╪½ ┘ê╪Ñ╪╡┘ä╪º╪¡ Agent
            </a>
          )}
          {step.action === 'open-printers' && (
            <span className="text-xs text-muted-foreground">
              ╪╣┘ä┘ë ╪º┘ä┘â┘à╪¿┘è┘ê╪¬╪▒: Settings ΓåÆ Bluetooth & devices ΓåÆ Printers & scanners
            </span>
          )}
          {(step.action === 'local-check' || step.action === 'upgrade' || step.action === 'repair-browser') && (
            <p className="w-full text-xs text-muted-foreground">
              {step.action === 'repair-browser' ? '╪┤╪║┘æ┘ä ┘à┘ä┘ü CMD ╪¿╪»╪¿┘ä ┘â┘ä┘è┘â ╪╣┘ä┘ë ┘å┘ü╪│ ╪¼┘ç╪º╪▓ Windows ╪º┘ä┘à╪│╪¬╪«╪»┘à ┘ä┘ä╪╖╪¿╪º╪╣╪⌐. ┘ä╪º╪▓┘à ╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä╪Ñ┘å╪¬╪▒┘å╪¬ ┘ä╪¬┘å╪▓┘è┘ä Chrome.' : '╪º┘ä┘à┘ä┘ü ╪¿┘è╪¬╪┤╪║┘æ┘ä ┘à╪¡┘ä┘è┘ï╪º ╪╣┘ä┘ë ┘â┘à╪¿┘è┘ê╪¬╪▒ ╪º┘ä┘â╪º╪┤┘è╪▒ ╪¿┘Ç Run with PowerShell. ╪º┘ä┘à╪¬╪╡┘ü╪¡ ┘à╪º ┘è┘é╪»╪▒╪┤ ┘è╪┤╪║┘æ┘ä┘ç ╪¿┘å┘ü╪│┘ç.'}
            </p>
          )}
          {(step.kind === 'agent' || step.kind === 'settings') && (
            <a href={PRINT_SERVICE_URL + '/health'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline underline-offset-2">
              <ExternalLink className="h-3 w-3" /> ┘ü╪¡╪╡ ╪º┘ä╪«╪»┘à╪⌐ ╪º┘ä┘à╪¿╪º╪┤╪▒
            </a>
          )}
        </div>
      </div>
      {step.kind === 'queue' && (
        <p className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          ┘à╪º ╪¬┘à╪│╪¡╪┤ ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪º┘å╪¬╪╕╪º╪▒ ╪ú┘ê ╪¬╪╢╪║╪╖ ╪╖╪¿╪º╪╣╪⌐ ┘à╪▒╪⌐ ╪¬╪º┘å┘è╪⌐ ┘é╪¿┘ä ┘à╪º ╪¬╪¬╪ú┘â╪» ╪Ñ┘å ╪º┘ä┘ê╪▒┘é╪⌐ ┘à╪º ╪«╪▒╪¼╪¬╪┤.
        </p>
