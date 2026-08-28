import React from "react";
import { ShieldCheck, Lock, AlertTriangle, KeyRound, Server, FileText, Cpu, CheckCircle } from "lucide-react";

export default function GuardDocsView() {
  return (
    <div className="p-8 space-y-8 font-sans bg-[#F4F1EE] text-[#1A1A1A] min-h-screen overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#D3D1CE] pb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
          <h1 className="text-2xl font-serif italic font-bold text-[#1A1A1A]">
            Documentação & Guia de Segurança — uRag Guard
          </h1>
        </div>
        <p className="text-xs text-stone-600 mt-1">
          Manual completo de governança, conformidade LGPD, máscaras PII, auditoria WORM imutável e controle de acessos SAML SSO.
        </p>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PII & LGPD */}
        <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-2xl p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
            <Lock className="w-4 h-4 text-amber-700" />
            <span>Máscara de Privacidade PII (LGPD)</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            O uRag Guard intercepta requisições enviadas às LLMs e substitui automaticamente dados sensíveis (CPF, cartões de crédito, e-mails pessoais, senhas) por tokens anônimos antes do processamento.
          </p>
        </div>

        {/* WORM Audit Logs */}
        <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-2xl p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
            <FileText className="w-4 h-4 text-indigo-700" />
            <span>Auditoria Imutável WORM</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Cada execução de Action ou chamada de agente gera um hash criptográfico WORM (*Write Once, Read Many*) registrado de forma inviolável para auditoria jurídica e compliance.
          </p>
        </div>

        {/* Guardrail Rules & Prompt Injection */}
        <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-2xl p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            <span>Regras Guardrail & Prompt Injection</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Verificação em tempo real contra ataques de *jailbreak*, toxicidade e injeção de prompt. Chamadas suspeitas são bloqueadas com status `REJECTED` imediatamente.
          </p>
        </div>

        {/* SAML SSO Multi-IdP */}
        <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-2xl p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <span>SAML SSO Multi-IdP & Chaves Virtuais</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Autenticação corporativa com suporte a Microsoft Entra ID (Azure AD), Okta e Google Workspace, com gerenciamento de chaves virtuais `sk_ic_...` e cotas por tenant.
          </p>
        </div>
      </div>
    </div>
  );
}
