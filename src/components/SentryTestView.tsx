import { useState } from "react";
import * as Sentry from "@sentry/react";

export default function SentryTestView() {
  const [status, setStatus] = useState<string | null>(null);

  const triggerHandledError = () => {
    try {
      throw new Error("Explicit GlitchTip Test Error from urag-guard-front (/sentry-test)");
    } catch (err) {
      Sentry.captureException(err);
      setStatus("Exceção capturada e enviada ao GlitchTip com sucesso!");
    }
  };

  const triggerUnhandledError = () => {
    setTimeout(() => {
      throw new Error("Unhandled Exception from urag-guard-front");
    }, 10);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-[#FAF8F5] border border-[#EBE7E2] rounded-xl shadow-xs space-y-5 text-[#1A1A1A]">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#1A1A1A]">
          Teste de Observabilidade — GlitchTip / Sentry
        </h2>
        <p className="text-sm text-[#6E6D68] mt-1">
          Módulo: <span className="font-mono font-medium text-[#1A1A1A]">urag-guard-front (:3001)</span>
        </p>
      </div>

      <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-900 leading-relaxed">
        Clique nos botões abaixo para disparar eventos de teste e verificar a recepção no projeto correspondente do GlitchTip.
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={triggerHandledError}
          className="px-4 py-2.5 bg-[#B91C1C] text-white text-xs font-semibold rounded-lg hover:bg-[#991B1B] transition-colors shadow-xs cursor-pointer"
        >
          Disparar Erro Capturado
        </button>
        <button
          type="button"
          onClick={triggerUnhandledError}
          className="px-4 py-2.5 bg-[#EBE7E2] text-[#1A1A1A] text-xs font-semibold rounded-lg hover:bg-[#E0DDD7] transition-colors border border-[#D8D4CE] cursor-pointer"
        >
          Disparar Erro Não Tratado
        </button>
      </div>

      {status && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg">
          {status}
        </div>
      )}
    </div>
  );
}
