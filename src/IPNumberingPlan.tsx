import { useState, useEffect } from 'react'
import { Sun, Moon, Languages, Map, Copy, Check } from 'lucide-react'

const translations = {
  en: {
    title: 'ISP IP Numbering Plan Generator',
    subtitle: 'Auto-generate a structured IP addressing plan from your allocation block. RFC 1918, RFC 6598 (CGNAT 100.64/10).',
    allocation: 'Base Allocation',
    allocationDesc: 'Enter your total IP block (e.g. 10.0.0.0/19)',
    network: 'Network address',
    prefix: 'Prefix length',
    p2pMode: 'P2P link mode',
    p2p30: '/30 (4 IPs per link)',
    p2p31: '/31 (RFC 3021, 2 IPs per link)',
    plan: 'Generated Plan',
    planDesc: 'Auto-allocated subnets for each purpose',
    subnet: 'Subnet',
    size: 'Usable IPs',
    purpose: 'Purpose',
    comment: 'Comment',
    mgmt: 'Management',
    mgmtComment: 'Equipment management, OOB access',
    loopbacks: 'Loopbacks',
    loopbackComment: 'Router loopback addresses (/32)',
    p2p: 'P2P Links',
    p2pComment: 'Point-to-point inter-router links',
    cgnat: 'CGNAT Pool',
    cgnatComment: 'Use 100.64.0.0/10 (RFC 6598) for CGNAT subscribers',
    customers: 'Customer Pools',
    customersComment: 'Residential/business subscriber address pools',
    reserve: 'Infrastructure Reserve',
    reserveComment: 'Future growth, expansion buffer',
    copy: 'Copy as text',
    copied: 'Copied!',
    totalIps: 'Total IPs',
    usedIps: 'Allocated IPs',
    availIps: 'Available IPs',
    rfcNote: 'RFC 1918 (private addresses), RFC 6598 (100.64/10 CGNAT), RFC 3021 (/31 P2P links)',
    builtBy: 'Built by',
    invalidNet: 'Invalid network address',
  },
  pt: {
    title: 'Gerador de Plano de Numeracao IP ISP',
    subtitle: 'Gere automaticamente um plano de enderecamento IP a partir do seu bloco de alocacao. RFC 1918, RFC 6598.',
    allocation: 'Alocacao Base',
    allocationDesc: 'Informe seu bloco IP total (ex: 10.0.0.0/19)',
    network: 'Endereco de rede',
    prefix: 'Tamanho do prefixo',
    p2pMode: 'Modo links P2P',
    p2p30: '/30 (4 IPs por link)',
    p2p31: '/31 (RFC 3021, 2 IPs por link)',
    plan: 'Plano Gerado',
    planDesc: 'Sub-redes alocadas automaticamente por finalidade',
    subnet: 'Sub-rede',
    size: 'IPs utilizaveis',
    purpose: 'Finalidade',
    comment: 'Comentario',
    mgmt: 'Gerencia',
    mgmtComment: 'Gerencia de equipamentos, acesso OOB',
    loopbacks: 'Loopbacks',
    loopbackComment: 'Enderecos loopback dos roteadores (/32)',
    p2p: 'Links P2P',
    p2pComment: 'Links ponto-a-ponto entre roteadores',
    cgnat: 'Pool CGNAT',
    cgnatComment: 'Use 100.64.0.0/10 (RFC 6598) para assinantes CGNAT',
    customers: 'Pools de Clientes',
    customersComment: 'Pools de enderecos para assinantes residenciais/empresariais',
    reserve: 'Reserva de Infraestrutura',
    reserveComment: 'Crescimento futuro, buffer de expansao',
    copy: 'Copiar como texto',
    copied: 'Copiado!',
    totalIps: 'Total de IPs',
    usedIps: 'IPs alocados',
    availIps: 'IPs disponiveis',
    rfcNote: 'RFC 1918 (enderecos privados), RFC 6598 (100.64/10 CGNAT), RFC 3021 (links /31)',
    builtBy: 'Criado por',
    invalidNet: 'Endereco de rede invalido',
  },
} as const

type Lang = keyof typeof translations

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) | parseInt(oct, 10), 0) >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function networkAddr(ip: string, prefix: number): string {
  const mask = prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1) >>> 0
  return intToIp((ipToInt(ip) & mask) >>> 0)
}

interface Segment {
  subnet: string
  prefix: number
  usable: number
  purpose: string
  comment: string
  color: string
}

type Translations = typeof translations[keyof typeof translations]

function generatePlan(baseIp: string, basePrefix: number, p2pMode: 30 | 31, t: Translations): Segment[] {
  let cursor = ipToInt(networkAddr(baseIp, basePrefix))
  const segments: Segment[] = []

  function alloc(prefix: number, purpose: string, comment: string, color: string) {
    const size = Math.pow(2, 32 - prefix)
    segments.push({
      subnet: `${intToIp(cursor)}/${prefix}`,
      prefix,
      usable: prefix >= 31 ? size : size - 2,
      purpose,
      comment,
      color,
    })
    cursor = (cursor + size) >>> 0
  }

  alloc(24, t.mgmt, t.mgmtComment, '#14b8a6')
  alloc(25, t.loopbacks, t.loopbackComment, '#0ea5e9')
  alloc(24, t.p2p, `${t.p2pComment} (${p2pMode === 31 ? '/31 RFC 3021' : '/30'})`, '#8b5cf6')

  // Remaining split: 50% customers, 25% reserve; use what's left
  const totalSize = Math.pow(2, 32 - basePrefix)
  const used = cursor - ipToInt(networkAddr(baseIp, basePrefix))
  const remaining = totalSize - used
  if (remaining > 0) {
    const custBits = Math.floor(Math.log2(remaining * 0.75))
    const custPrefix = Math.max(32 - custBits, basePrefix + 1)
    alloc(custPrefix, t.customers, t.customersComment, '#22c55e')

    const newUsed = cursor - ipToInt(networkAddr(baseIp, basePrefix))
    const leftover = totalSize - newUsed
    if (leftover > 0) {
      const resBits = Math.floor(Math.log2(leftover))
      if (resBits > 0) {
        const resPrefix = Math.max(32 - resBits, basePrefix + 1)
        alloc(resPrefix, t.reserve, t.reserveComment, '#f59e0b')
      }
    }
  }

  return segments
}

export default function IPNumberingPlan() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [network, setNetwork] = useState('10.0.0.0')
  const [prefix, setPrefix] = useState(19)
  const [p2pMode, setP2pMode] = useState<30 | 31>(31)
  const [copied, setCopied] = useState(false)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const octets = network.split('.').map(Number)
  const isValid = octets.length === 4 && octets.every(o => !isNaN(o) && o >= 0 && o <= 255)
  const segments = isValid ? generatePlan(network, prefix, p2pMode, t) : []
  const totalIps = Math.pow(2, 32 - prefix)
  const usedIps = segments.reduce((s, seg) => s + Math.pow(2, 32 - seg.prefix), 0)

  const copyText = () => {
    const lines = [
      `# IP Numbering Plan - ${network}/${prefix}`,
      `# Generated by gmowses.github.io/ip-numbering-plan`,
      '',
      ...segments.map(s => `${s.subnet.padEnd(20)} # ${s.purpose} - ${s.comment}`),
    ].join('\n')
    navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Map size={18} className="text-white" />
            </div>
            <span className="font-semibold">IP Numbering Plan</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/ip-numbering-plan" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Config */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="mb-4">
              <h2 className="font-semibold">{t.allocation}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.allocationDesc}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.network}</label>
                <input
                  value={network}
                  onChange={e => setNetwork(e.target.value)}
                  placeholder="10.0.0.0"
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {!isValid && <p className="text-xs text-red-500">{t.invalidNet}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{t.prefix}</label>
                  <span className="text-sm font-bold text-teal-500">/{prefix}</span>
                </div>
                <input type="range" min={16} max={24} step={1} value={prefix} onChange={e => setPrefix(Number(e.target.value))} className="h-1.5 w-full cursor-pointer accent-teal-500" />
                <div className="flex justify-between text-[10px] text-zinc-400"><span>/16</span><span>/24</span></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.p2pMode}</label>
                <div className="space-y-1">
                  {([30, 31] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="p2p" value={m} checked={p2pMode === m} onChange={() => setP2pMode(m)} className="accent-teal-500" />
                      <span className="text-sm">{m === 31 ? t.p2p31 : t.p2p30}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {isValid && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t.totalIps, value: totalIps.toLocaleString() },
                { label: t.usedIps, value: usedIps.toLocaleString(), accent: true },
                { label: t.availIps, value: (totalIps - usedIps).toLocaleString() },
              ].map(({ label, value, accent }) => (
                <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{label}</p>
                  <p className={`text-xl font-bold tabular-nums ${accent ? 'text-teal-500' : ''}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Plan table */}
          {isValid && segments.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{t.plan}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.planDesc}</p>
                </div>
                <button onClick={copyText} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {copied ? <Check size={14} className="text-teal-500" /> : <Copy size={14} />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      {[t.subnet, t.size, t.purpose, t.comment].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] uppercase tracking-wide text-zinc-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((seg, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                            <span className="font-mono font-semibold">{seg.subnet}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{seg.usable.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-medium">{seg.purpose}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{seg.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CGNAT note */}
              <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 px-4 py-3">
                <p className="text-xs text-teal-700 dark:text-teal-300"><strong>{t.cgnat}:</strong> {t.cgnatComment}</p>
              </div>

              <p className="text-[10px] text-zinc-400">{t.rfcNote}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-teal-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
