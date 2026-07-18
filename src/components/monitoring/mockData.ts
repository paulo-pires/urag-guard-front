export function generateMonitoringData(period: string, selectedSources: string[]) {
  const dataPoints = period === "24h" ? 24 : period === "30d" ? 30 : 7;
  const today = new Date();

  return Array.from({ length: dataPoints }).map((_, idx) => {
    const d = new Date();
    if (period === "24h") {
      d.setHours(today.getHours() - (dataPoints - 1 - idx));
    } else {
      d.setDate(today.getDate() - (dataPoints - 1 - idx));
    }

    const label = period === "24h" 
      ? `${String(d.getHours()).padStart(2, "0")}:00`
      : period === "30d"
      ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
      : d.toLocaleDateString("pt-BR", { weekday: "short" });

    const runMultiplier = selectedSources.length > 0 ? selectedSources.length / 5 : 1;
    const baseRuns = Math.floor(15 + Math.random() * 35 * runMultiplier);
    const errors = Math.floor(Math.random() * 2.5);
    const ok = baseRuns - errors;
    const cost = Number((baseRuns * (0.0004 + Math.random() * 0.0008)).toFixed(4));
    const flag = Math.floor(Math.random() * 1.2);
    const block = Math.floor(Math.random() * 0.4);

    // Latency values
    const latency_p50 = Math.floor(250 + Math.random() * 150);
    const latency_p95 = Math.floor(650 + Math.random() * 400);
    const latency_p99 = Math.floor(1200 + Math.random() * 800);
    const error_rate = Number(((errors / baseRuns) * 100).toFixed(1));

    // LLM Calls
    const llm_calls = Math.floor(baseRuns * 1.2);
    const llm_errors = Math.floor(Math.random() * 1.5);
    const llm_latency = Math.floor(180 + Math.random() * 120);
    const llm_success_rate = Number(((llm_calls - llm_errors) / llm_calls * 100).toFixed(1));

    // Tokens
    const output_tokens = baseRuns * Math.floor(150 + Math.random() * 100);
    const output_tokens_per_trace = Math.floor(150 + Math.random() * 50);
    const input_tokens = baseRuns * Math.floor(600 + Math.random() * 400);
    const input_tokens_per_trace = Math.floor(600 + Math.random() * 200);

    // Tools data
    const tool_search_runs = Math.floor(baseRuns * 0.4);
    const tool_retrieve_runs = Math.floor(baseRuns * 0.8);
    const tool_db_runs = Math.floor(baseRuns * 0.3);

    const tool_search_latency = Math.floor(450 + Math.random() * 200);
    const tool_retrieve_latency = Math.floor(120 + Math.random() * 60);
    const tool_db_latency = Math.floor(80 + Math.random() * 40);

    const tool_search_error = Number((Math.random() * 5).toFixed(1));
    const tool_retrieve_error = Number((Math.random() * 2).toFixed(1));
    const tool_db_error = Number((Math.random() * 1).toFixed(1));

    // Run Types depth=1
    const run_chain_count = Math.floor(baseRuns * 0.5);
    const run_agent_count = Math.floor(baseRuns * 0.25);
    const run_tool_count = Math.floor(baseRuns * 1.5);
    const run_llm_count = Math.floor(baseRuns * 1.2);

    const run_chain_latency = Math.floor(800 + Math.random() * 400);
    const run_agent_latency = Math.floor(1500 + Math.random() * 1000);
    const run_tool_latency = Math.floor(250 + Math.random() * 150);
    const run_llm_latency = Math.floor(400 + Math.random() * 200);

    const run_chain_error = Number((Math.random() * 4).toFixed(1));
    const run_agent_error = Number((Math.random() * 8).toFixed(1));
    const run_tool_error = Number((Math.random() * 2).toFixed(1));
    const run_llm_error = Number((Math.random() * 3).toFixed(1));

    return {
      name: label,
      ok,
      erro: errors,
      custo: cost,
      flag,
      block,
      faithfulness: Number((0.78 + Math.random() * 0.2).toFixed(2)),
      relevancy: Number((0.82 + Math.random() * 0.16).toFixed(2)),
      recall: Number((0.72 + Math.random() * 0.23).toFixed(2)),
      
      // Traces
      traces_success: ok,
      traces_error: errors,
      latency_p50,
      latency_p95,
      latency_p99,
      error_rate,

      // LLM Calls
      llm_calls,
      llm_errors,
      llm_latency,
      llm_success_rate,

      // Cost & Tokens
      output_tokens,
      output_tokens_per_trace,
      input_tokens,
      input_tokens_per_trace,

      // Tools
      tool_search_runs,
      tool_retrieve_runs,
      tool_db_runs,
      tool_search_latency,
      tool_retrieve_latency,
      tool_db_latency,
      tool_search_error,
      tool_retrieve_error,
      tool_db_error,

      // Run Types
      run_chain_count,
      run_agent_count,
      run_tool_count,
      run_llm_count,
      run_chain_latency,
      run_agent_latency,
      run_tool_latency,
      run_llm_latency,
      run_chain_error,
      run_agent_error,
      run_tool_error,
      run_llm_error,
    };
  });
}
