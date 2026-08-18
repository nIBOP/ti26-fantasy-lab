(() => {
  const data = window.FANTASY_DATA;
  let selectedDay = data.daily;
  const categoryNames = {core: "Коры", mid: "Мидер", support: "Поддержка"};
  const positionNames = {1: "Керри", 2: "Мидер", 3: "Оффлейнер", 4: "Поддержка", 5: "Поддержка"};
  const formulas = [
    "Kills: 1,21 × убийства", "Deaths: 18 − 1,8 × смерти", "Creep Score: 0,03 × крипы",
    "GPM: 0,02 × GPM", "Madstone: 0,19 × безумруды", "Tower Kills: 3,40 × башни",
    "Wards: 1,13 × observer wards", "Camps: 1,70 × стаки", "Runes: 1,21 × руны",
    "Watchers: 1,21 × смотрители", "Lotuses: 1 / 3 / 6", "Roshan: 8,50 × убийства",
    "Teamfights: 18,95 × участие", "Stuns: 0,15 × секунды", "Tormentor: 8,50 × убийства",
    "Courier: 8,50 × убийства", "First blood: 17", "Smoke: 2,83 × применения"
  ];

  const state = {category: "core", search: "", sort: "model", selected: null, metric: "kills"};
  const playoffState = {scenario: "balanced"};
  const $ = (id) => document.getElementById(id);
  const fmt = (value, digits = 2) => value == null || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString("ru-RU", {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const aspectText = (player, detailed = false) => (player?.aspects || []).map(a => {
    const value = detailed && a.historicalBonusPerMap != null ? ` · +${fmt(a.historicalBonusPerMap)}/карта` : "";
    return `${a.name} +${a.bonusPct}%${value}`;
  }).join(" · ");
  const aspectChoice = player => player?.recommendedAspect
    ? `Выбирать: ${player.recommendedAspect}${player.recommendedAspectPreliminary ? "*" : ""}`
    : "Выбор пока не определён";
  const seriesText = player => {
    if (player?.guaranteed_two_series === true) return "2 серии гарантированы";
    const chance = Number(player?.second_series_probability);
    if (Number.isFinite(chance) && chance > 0) return `${fmt(chance * 100, 0)}% шанс второй серии`;
    const expected = Number(player?.series_count);
    return expected > 1 ? `${fmt(expected, 2)} ожидаемых серии` : "1 серия";
  };
  const roleTournamentWeight = (daily, role) => Number(daily?.tournamentWeights?.[role] || 1);

  function renderPlayoffForecast() {
    const playoff = data.playoffs;
    if (!playoff) return;
    const scenario = playoff.scenarios.find(item => item.id === playoffState.scenario) || playoff.scenarios[0];
    $("playoff-source").href = playoff.source;
    $("playoff-scenario-tabs").innerHTML = playoff.scenarios.map(item => `
      <button class="scenario-button ${item.id === scenario.id ? "active" : ""}" data-playoff-scenario="${item.id}">
        <strong>${esc(item.label)}</strong><span>TI ${fmt(item.tiWeight, 0)}×</span>
      </button>`).join("");
    document.querySelectorAll("[data-playoff-scenario]").forEach(button => button.addEventListener("click", () => {
      playoffState.scenario = button.dataset.playoffScenario;
      renderPlayoffForecast();
    }));
    const predictedFinal = scenario.predictedBracket.find(match => match.id === "GF");
    $("playoff-scenario-note").innerHTML = `<strong>${esc(scenario.label)}:</strong> ${esc(scenario.description)} <span>Прогноз финала: ${esc(predictedFinal.teamA)} — ${esc(predictedFinal.teamB)}; чемпион — ${esc(predictedFinal.winner)} (${fmt(Number(predictedFinal.winnerProbability) * 100, 0)}%).</span>`;
    const matchById = new Map(scenario.predictedBracket.map(match => [match.id, match]));
    const bracketLanes = [
      ["Верхняя сетка", [["UQF1", "UQF2", "UQF3", "UQF4"], ["USF1", "USF2"], ["UBF"]]],
      ["Нижняя сетка", [["LBR1-1", "LBR1-2"], ["LBQF1", "LBQF2"], ["LBSF"], ["LBF"]]],
      ["Финал", [["GF"]]],
    ];
    const bracketCard = match => {
      const pA = Number(match.probabilityA), pB = 1 - pA;
      return `<article class="bracket-match">
        <small>${esc(match.id)} · Bo${match.bestOf}</small>
        <div class="${match.winner === match.teamA ? "winner" : ""}"><strong>${esc(match.teamA)}</strong><span>${fmt(pA * 100, 0)}%</span></div>
        <div class="${match.winner === match.teamB ? "winner" : ""}"><strong>${esc(match.teamB)}</strong><span>${fmt(pB * 100, 0)}%</span></div>
      </article>`;
    };
    $("playoff-full-bracket").innerHTML = bracketLanes.map(([lane, rounds]) => `<section class="bracket-lane">
      <h3>${lane}</h3><div class="bracket-rounds">${rounds.map((ids, index) => `<div class="bracket-round"><h4>${index + 1} раунд</h4>${ids.map(id => bracketCard(matchById.get(id))).join("")}</div>`).join("")}</div>
    </section>`).join("");
    $("playoff-quarterfinals").innerHTML = scenario.quarterfinals.map(match => {
      const pA = Number(match.seriesProbabilityA);
      const pB = 1 - pA;
      return `<article class="playoff-match">
        <div><strong class="${pA >= .5 ? "favorite" : ""}">${esc(match.teamA)}</strong><span>${fmt(pA * 100, 0)}%</span></div>
        <div class="playoff-probability"><b style="width:${pA * 100}%"></b><i style="width:${pB * 100}%"></i></div>
        <div><strong class="${pB > .5 ? "favorite" : ""}">${esc(match.teamB)}</strong><span>${fmt(pB * 100, 0)}%</span></div>
      </article>`;
    }).join("");
    const maxChampion = Math.max(...scenario.teams.map(team => Number(team.champion)));
    $("playoff-team-odds").innerHTML = scenario.teams.map((team, index) => `<div class="playoff-team-row">
      <b>${index + 1}</b><span><strong>${esc(team.team)}</strong><small>финал ${fmt(Number(team.final) * 100, 0)}% · топ‑3 ${fmt(Number(team.top3) * 100, 0)}%</small></span>
      <div class="odds-track"><i style="width:${Number(team.champion) / maxChampion * 100}%"></i></div><em>${fmt(Number(team.champion) * 100, 1)}%</em>
    </div>`).join("");
    $("playoff-meta").innerHTML = `${playoff.tiMaps} карт текущего TI · ${Number(playoff.simulationsPerScenario).toLocaleString("ru-RU")} симуляций на сценарий · Bo3, гранд-финал Bo5. Диапазон сценариев нужен как проверка чувствительности, а не как доверительный интервал.`;
  }

  function renderDailyForecast() {
    const daily = selectedDay;
    if (!daily) return;
    $("day-switch").innerHTML = (data.matchdays || [daily]).map(day => `<button class="day-button ${day.dateKey === daily.dateKey ? "active" : ""}" data-day="${esc(day.dateKey)}"><strong>${esc(day.date.replace(" 2026", ""))}</strong><span>${day.status === "not_published" ? "ожидаем пары" : day.status === "active_partial" ? "8 пар + поздний раунд" : day.status === "historical" ? "завершён" : "прогноз готов"}</span></button>`).join("");
    document.querySelectorAll(".day-button").forEach(button => button.addEventListener("click", () => {
      selectedDay = data.matchdays.find(day => day.dateKey === button.dataset.day) || daily;
      renderDailyForecast();
    }));
    $("active-day-label").textContent = `Матчи ${daily.date.replace(" 2026", "")}`;
    $("daily-title").textContent = `Кого выбрать на игровой день ${daily.date.replace(" 2026", "")}`;
    $("daily-copy").hidden = false;
    $("daily-copy").innerHTML = `Прогноз привязан только к матчам <strong>${esc(daily.date)}</strong>. Используются официальный список пар, сила соперника, текущий патч, ожидаемый драфт, результаты TI с роль-зависимым весом и cluster-bootstrap целыми сериями. Двух коров и двух саппортов можно комбинировать из любых участвующих команд.`;
    $("schedule-pending").hidden = true;
    $("daily-fixtures").hidden = false;
    document.querySelector(".daily-grid").hidden = false;
    if (daily.status === "active") {
      $("hero-day-copy").textContent = `Прогноз Elimination Round был рассчитан до начала серий на 97 картах TI; для прогноза плей‑офф ниже уже загружено 109 карт.`;
      $("daily-eyebrow").textContent = `ПРОГНОЗ НА АКТИВНЫЙ ИГРОВОЙ ДЕНЬ · ${daily.date.toLocaleUpperCase("ru")}`;
    }
    if (daily.status === "active_partial") {
      $("hero-day-copy").textContent = `Текущий TI весит сильнее истории: коры ${fmt(roleTournamentWeight(daily, "core"), 0)}×, мидеры ${fmt(roleTournamentWeight(daily, "mid"), 0)}×, саппорты ${fmt(roleTournamentWeight(daily, "support"), 0)}×; граф команд ${fmt(daily.graphTournamentWeight || 1, 0)}×.`;
      $("daily-eyebrow").textContent = `ПРОГНОЗ НА ${daily.date.toLocaleUpperCase("ru")} · ПОСЛЕ 59 КАРТ TI`;
      $("schedule-pending").hidden = false;
      $("schedule-pending").innerHTML = `<strong>Пятый Swiss-раунд ещё условный</strong><p>Liquipedia опубликовала ${daily.publishedFixtures} точных пар четвёртого раунда и ${daily.pendingSlots} условных слотов пятого. Команды со счётом 2–1 и 1–2 гарантированно сыграют две серии; для команд 3–0 и 0–3 вероятность второй серии зависит от результата первой. До появления точных пар модель усредняет допустимых Swiss-соперников.</p><a href="${esc(daily.source)}" target="_blank" rel="noopener">Открыть расписание Liquipedia ↗</a>`;
    }
    if (daily.status === "not_published") {
      $("hero-day-copy").textContent = "Liquipedia ещё не опубликовала Swiss-пары следующего раунда. Прогноз временно скрыт, чтобы не показывать устаревшие матчи.";
      $("daily-eyebrow").textContent = `РАСПИСАНИЕ ${daily.date.toLocaleUpperCase("ru")} ЕЩЁ НЕ ОПУБЛИКОВАНО`;
      $("daily-copy").hidden = true;
      $("schedule-pending").hidden = false;
      $("schedule-pending").innerHTML = `<strong>Ожидаем официальные пары Swiss</strong><p>В исходнике Liquipedia сейчас нет полного расписания на ${esc(daily.date)}. После появления пар страницу нужно пересчитать — переносить рекомендации с другого дня мы не будем.</p><a href="${esc(daily.source)}" target="_blank" rel="noopener">Открыть расписание Liquipedia ↗</a>`;
      $("daily-fixtures").hidden = true;
      document.querySelector(".daily-grid").hidden = true;
      return;
    }
    $("daily-fixtures").innerHTML = daily.fixtures.map(f => {
      const p = Number(f.team_a_map_win_probability);
      const favorite = p >= .5 ? f.team_a : f.team_b;
      const favoriteP = Math.max(p, 1 - p);
      return `<article class="fixture-card">
        <span>${esc(f.time)}</span>
        <strong>${esc(f.team_a)} <i>—</i> ${esc(f.team_b)}</strong>
        <small>Фаворит: ${esc(favorite)} · ${fmt(favoriteP * 100, 0)}% за карту</small>
        <div class="probability"><b style="width:${p * 100}%"></b></div>
        <small>3 карты: ${fmt(Number(f.three_map_probability) * 100, 0)}% · ${fmt(f.expected_duration_minutes, 1)} мин</small>
        <small class="confidence confidence-${f.confidence === "высокая" ? "high" : f.confidence === "средняя" ? "medium" : "low"}">Уверенность графа: ${esc(f.confidence)}</small>
      </article>`;
    }).join("");

    const roles = [["core", "Коры 1/3"], ["mid", "Мидеры"], ["support", "Саппорты 4/5"]];
    $("daily-role-leaders").innerHTML = roles.map(([role, label]) => {
      const rows = daily.players.filter(p => p.role_group === role && p.high_confidence === true).slice(0, 5);
      return `<div class="daily-role"><h4>${label}</h4>${rows.map((p, i) => `
        <div class="daily-player">
          <b>${i + 1}</b><span><strong>${esc(p.player_name)}</strong><small>${esc(p.team)} → ${esc(p.opponent)} · ${esc(seriesText(p))}${p.ti_maps != null ? ` · ${p.ti_maps} карт TI с весом ${fmt(roleTournamentWeight(daily, p.role_group), 0)}×` : ""}</small><small class="daily-aspects"><strong>${esc(aspectChoice(p))}</strong> · ${esc(p.recommendedAspectReason)}</small></span>
          <em>${fmt(p.projected_day_total)}${p.projected_day_p10 != null ? `<small>${fmt(p.projected_day_p10, 0)}–${fmt(p.projected_day_p90, 0)} · P(лучший) ${fmt(Number(p.probability_best_in_role) * 100, 0)}%</small>` : `<small class="${Number(p.matchup_delta) >= 0 ? "positive" : "negative"}">${Number(p.matchup_delta) >= 0 ? "+" : ""}${fmt(p.matchup_delta)}</small>`}</em>
        </div>`).join("")}</div>`;
    }).join("");

    const reliable = daily.reliableLineups || [];
    const best = reliable[0] || daily.lineups[0];
    const evBest = daily.lineups[0];
    const riskMode = Boolean(reliable.length && best?.risk_adjusted_day_total != null);
    const alternatives = (reliable.length ? reliable : daily.lineups).slice(1, 5);
    const byName = new Map(daily.players.map(p => [p.player_name, p]));
    const names = value => String(value || "").split("+").map(x => x.trim());
    const lineupAspects = value => names(value).map(name => {
      const player = byName.get(name);
      return `${name} — ${aspectChoice(player)} (${player?.recommendedAspectReason || "нет данных"})`;
    }).join("; ");
    $("daily-lineup").innerHTML = best ? `<article class="lineup-card">
      <div class="lineup-total"><span>${riskMode ? "Надёжный · выбран по P25-score" : "Исторический прогноз"}</span><strong>${fmt(best.projected_day_total)}</strong>${riskMode ? `<small>P25-score ${fmt(best.risk_adjusted_day_total)}</small><small>Консервативная сумма P10–P90: ${fmt(best.projected_day_p10_proxy, 0)}–${fmt(best.projected_day_p90_proxy, 0)}</small>` : `<small>Расчёт до механики капитана</small>`}</div>
      <dl>
        ${best.captain ? `<div class="captain-pick"><dt>Капитан · выбран по P25-score</dt><dd>${esc(best.captain)} ×2</dd><small>${esc(best.captain_team)} · средний бонус ${fmt(best.captain_bonus)}, P25 ${fmt(best.captain_risk_score)}</small></div>` : ""}
        <div><dt>Коры · ${esc(best.core_teams)}</dt><dd>${esc(best.cores)}</dd><small>${esc(lineupAspects(best.cores))}</small></div>
        <div><dt>Мидер · ${esc(best.mid_team)}</dt><dd>${esc(best.mid)}</dd><small>${esc(lineupAspects(best.mid))}</small></div>
        <div><dt>Саппорты · ${esc(best.support_teams)}</dt><dd>${esc(best.supports)}</dd><small>${esc(lineupAspects(best.supports))}</small></div>
      </dl>
    </article>
    ${reliable.length && evBest ? `<div class="risk-comparison"><strong>Почему это основной состав</strong><p>Участие всех пяти игроков гарантировано; каждый проведёт ${fmt(best.minimum_guaranteed_series || 1, 0)} серию. Состав и капитан оптимизированы по P25-score series-bootstrap, а не по одному среднему. Чистый максимум ожидания — ${esc(evBest.cores)} / ${esc(evBest.mid)} / ${esc(evBest.supports)}, капитан ${esc(evBest.captain)} ×2 — даёт ${fmt(evBest.projected_day_total)}, но имеет более рискованный путь.</p></div>` : ""}
    <p class="aspect-warning">* Для саппортов рекомендация предварительная: Визионер выбран по измеренным observer wards; статистики смотрителей для проверки Фотографа пока нет.</p>
    <div class="alternative-list"><h4>${riskMode ? "Ближайшие альтернативы по P25-score" : "Ближайшие альтернативы"}</h4>${alternatives.map((x, i) => `<div><span>#${i + 2} ${esc(x.cores)} / ${esc(x.mid)} / ${esc(x.supports)}${x.captain ? ` · капитан ${esc(x.captain)} ×2` : ""}</span><strong>${fmt(x.risk_adjusted_day_total ?? x.projected_day_total)}</strong></div>`).join("")}</div>` : "—";
  }

  function rankingRows() {
    const query = state.search.trim().toLocaleLowerCase("ru");
    const rows = data.rankings.filter(r => inCurrentCategory(r) && (!query || `${r.player_name} ${r.team}`.toLocaleLowerCase("ru").includes(query)));
    const keys = {model: "shrunk_total_owned_mean", mean: "total_owned_mean", p75: "total_owned_p75", sample: "maps"};
    const key = keys[state.sort];
    return rows.sort((a, b) => (Number(b[key] ?? -Infinity) - Number(a[key] ?? -Infinity)));
  }

  function inCurrentCategory(row) {
    const position = Number(row.position);
    if (state.category === "core") return position === 1 || position === 3;
    if (state.category === "support") return position === 4 || position === 5;
    return position === 2;
  }

  function renderTabs() {
    $("position-tabs").innerHTML = Object.entries(categoryNames).map(([category, name]) =>
      `<button class="position-tab ${category === state.category ? "active" : ""}" data-category="${category}" role="tab">${category === "core" ? "1/3" : category === "mid" ? "2" : "4/5"} · ${name}</button>`
    ).join("");
    document.querySelectorAll(".position-tab").forEach(btn => btn.addEventListener("click", () => {
      state.category = btn.dataset.category; state.selected = null; render();
    }));
  }

  function renderLeaders(rows) {
    const leaders = rows.filter(r => r.total_owned_mean != null).slice(0, 3);
    $("leaders").innerHTML = leaders.map((r, i) => `
      <button class="leader-card" data-account="${r.account_id}" data-rank="${i + 1}">
        <span class="leader-rank">#${i + 1} · ${i === 0 ? "ЛИДЕР" : "ТОП ПОЗИЦИИ"}</span>
        <h3>${esc(r.player_name)}</h3><div class="leader-team">${esc(r.team)}</div>
        <div class="leader-score"><strong>${fmt(r.total_owned_mean)}</strong> очка / карта</div>
      </button>`).join("");
    document.querySelectorAll(".leader-card").forEach(card => card.addEventListener("click", () => selectPlayer(Number(card.dataset.account))));
  }

  function renderTable(rows) {
    $("ranking-title").textContent = categoryNames[state.category];
    $("result-count").textContent = `${rows.length} игроков`;
    $("ranking-body").innerHTML = rows.map((r, index) => {
      const low = Number(r.maps) < 30;
      const rank = String(index + 1);
      const selected = Number(r.account_id) === state.selected ? "selected" : "";
      return `<tr class="${selected}" data-account="${r.account_id}">
        <td class="rank-number">${rank}</td>
        <td class="player-cell"><strong>${esc(r.player_name)}</strong><span>${esc(r.team)}</span></td>
        <td class="${low ? "sample-low" : ""}">${r.maps || "—"}</td>
        <td>${fmt(r.base_mean)}</td><td>+${fmt(r.owned_bonus_mean)}</td>
        <td class="value-main">${fmt(r.total_owned_mean)}</td><td>${fmt(r.total_owned_p75)}</td>
        <td><span class="aspect-badge">${esc(r.best_owned_aspect || "нет данных")}${r.best_owned_aspect_bonus_mean != null ? ` · +${fmt(r.best_owned_aspect_bonus_mean)}` : ""}</span></td>
      </tr>`;
    }).join("");
    document.querySelectorAll("#ranking-body tr").forEach(row => row.addEventListener("click", () => selectPlayer(Number(row.dataset.account))));
  }

  function selectPlayer(accountId) {
    state.selected = accountId;
    const player = data.rankings.find(r => Number(r.account_id) === accountId);
    if (!player) return;
    $("player-empty").hidden = true; $("player-content").hidden = false;
    $("player-position").textContent = `ПОЗИЦИЯ ${player.position} · ${positionNames[player.position]}`;
    $("player-name").textContent = player.player_name; $("player-team").textContent = `${player.team} · ${player.maps || 0} карт`;
    $("player-total").textContent = fmt(player.total_owned_mean); $("player-bonus").textContent = `+${fmt(player.owned_bonus_mean)}`;
    $("player-p75").textContent = fmt(player.total_owned_p75);
    $("player-best-aspect").textContent = player.best_owned_aspect_bonus_mean == null ? "нет данных" : `${player.best_owned_aspect} · +${fmt(player.best_owned_aspect_bonus_mean)}`;
    const metrics = data.metrics.filter(m => Number(m.account_id) === accountId).sort((a, b) => Number(b.mean_formula_points ?? -1) - Number(a.mean_formula_points ?? -1));
    $("player-metrics").innerHTML = metrics.map(m => `<div class="metric-row ${m.mean_value == null ? "metric-missing" : ""}">
      <div class="metric-name"><strong>${esc(m.metric_label)}</strong><span>${m.mean_value == null ? "нет данных" : `p75: ${fmt(m.p75_value)}`}${m.aspect_name ? ` · ${esc(m.aspect_name)}` : ""}</span></div>
      <div class="metric-value">${fmt(m.mean_value)}</div><div class="metric-points">${fmt(m.mean_formula_points)}</div>
    </div>`).join("");
    renderTable(rankingRows());
    if (window.innerWidth < 1050) $("player-panel").scrollIntoView({behavior: "smooth", block: "start"});
  }

  function renderMetricOptions() {
    const labels = new Map(data.metrics.map(m => [m.metric, m.metric_label]));
    $("metric-select").innerHTML = [...labels.entries()].map(([metric, label]) => `<option value="${metric}" ${metric === state.metric ? "selected" : ""}>${esc(label)}</option>`).join("");
  }

  function renderExplorer() {
    const rows = data.metrics.filter(m => inCurrentCategory(m) && m.metric === state.metric && m.mean_value != null)
      .sort((a, b) => Number(b.mean_formula_points) - Number(a.mean_formula_points));
    const coverage = data.coverage.find(c => c.metric === state.metric);
    const label = data.metrics.find(m => m.metric === state.metric)?.metric_label || state.metric;
    $("metric-summary").innerHTML = `<span>Показатель: <strong>${esc(label)}</strong></span><span>Покрытие: <strong>${coverage ? fmt(Number(coverage.coverage) * 100, 0) + "%" : "—"}</strong></span><span>Игроков с данными: <strong>${rows.length}</strong></span>`;
    if (!rows.length) {
      $("metric-chart").innerHTML = `<div class="notice"><span class="notice-icon">!</span><p>Для этого показателя данных пока нет. Он не участвует в рейтинге.</p></div>`;
      return;
    }
    const max = Math.max(...rows.map(r => Number(r.mean_formula_points)));
    $("metric-chart").innerHTML = rows.map(r => `<div class="bar-row">
      <div class="bar-label"><strong>${esc(r.player_name)}</strong><br><span>${esc(r.team)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Number(r.mean_formula_points) / max * 100)}%"></div></div>
      <div class="bar-value">${fmt(r.mean_value)}</div>
    </div>`).join("");
  }

  function render() {
    renderTabs();
    const rows = rankingRows(); renderLeaders(rows); renderTable(rows); renderMetricOptions(); renderExplorer();
    if (state.selected && !rows.some(r => Number(r.account_id) === state.selected)) closePlayer();
  }

  function closePlayer() {
    state.selected = null; $("player-content").hidden = true; $("player-empty").hidden = false; renderTable(rankingRows());
  }

  const dotaState = {role: "core", metric: "kills", search: ""};
  const freshDotaFantasyConfigs = () => Object.fromEntries(Object.entries(data.dotaFantasy.meta.emblems).map(([role, emblems]) => [
    role, emblems.map(item => ({metric: item.metric, growth: Math.round(Number(item.total_multiplier) * 100)}))
  ]));
  const dotaFantasyState = {configs: freshDotaFantasyConfigs()};
  const dotaRoleNames = {core: "1/3 · Коры", mid: "2 · Мидеры", support: "4/5 · Поддержка"};
  const dotaColorNames = {red: "Красная эмблема", blue: "Синяя эмблема", green: "Зелёная эмблема"};
  const dotaAllowedColors = {core: ["red", "green"], mid: ["red", "blue", "green"], support: ["blue", "green"]};
  const dotaDefaultMetric = {core: "kills", mid: "kills", support: "observer_wards"};

  function setView(view, updateHash = true) {
    const isForecast = view === "forecast";
    const isPlayoffs = view === "playoffs";
    const isDotaFantasy = view === "dota-fantasy";
    const isDota = view === "dota-rules";
    const isWardMap = view === "ward-map";
    $("forecast-view").hidden = !isForecast;
    $("playoffs-view").hidden = !isPlayoffs;
    $("dota-fantasy-view").hidden = !isDotaFantasy;
    $("dota-rules-view").hidden = !isDota;
    $("ward-map-view").hidden = !isWardMap;
    document.body.classList.toggle("dota-rules-mode", isDota);
    document.body.classList.toggle("dota-fantasy-mode", isDotaFantasy);
    document.body.classList.toggle("playoffs-mode", isPlayoffs);
    document.body.classList.toggle("ward-map-mode", isWardMap);
    document.querySelectorAll(".mode-button").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
      button.setAttribute("aria-selected", button.dataset.view === view ? "true" : "false");
    });
    if (isDota) renderDotaRules();
    if (isDotaFantasy) renderDotaFantasy();
    if (isPlayoffs) renderPlayoffForecast();
    if (isWardMap) window.dispatchEvent(new CustomEvent("ward-map:show"));
    if (updateHash) history.replaceState(null, "", `#${view}`);
  }

  function renderDotaFantasy() {
    const fantasy = data.dotaFantasy;
    if (!fantasy) return;
    const roleNames = {core: "1/3 · Основа", mid: "2 · Центр", support: "4/5 · Поддержка"};
    const meta = fantasy.meta;
    $("dota-fantasy-scope").innerHTML = `<span><strong>${meta.maps}</strong> карт Tier‑1</span><span><strong>${meta.tiMaps}</strong> карт TI</span><span><strong>${meta.players}</strong> игроков</span>`;
    const playoffTeams = new Set(data.playoffs.scenarios[0].teams.map(item => item.team));
    const unavailable = new Set(data.dotaRules.meta.unavailableMetrics);
    const estimated = new Set(data.dotaRules.meta.estimatedMetrics || []);
    const rules = data.dotaRules.meta.rules;
    const ruleByMetric = new Map(rules.map(rule => [rule.metric, rule]));
    const playoffMetrics = data.dotaRules.playerMetrics.filter(row => playoffTeams.has(row.team));
    const metricLookup = new Map(playoffMetrics.map(row => [`${row.account_id}:${row.metric}`, row]));
    const roleMetricValue = (role, metric) => {
      const values = playoffMetrics.filter(row => row.role_group === role && row.metric === metric && row.weighted_mean_score != null).map(row => Number(row.weighted_mean_score));
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    $("dota-fantasy-emblem-tiers").innerHTML = Object.entries(roleNames).map(([role, label]) => {
      const colorGroups = dotaAllowedColors[role].map(color => {
        const ranked = rules.filter(rule => rule.color === color).map(rule => ({...rule, value: roleMetricValue(role, rule.metric)})).filter(item => item.value != null).sort((a, b) => b.value - a.value);
        return `<section class="dota-fantasy-tier-color formula-${color}"><h4>${esc(dotaColorNames[color])}</h4>${ranked.map((item, index) => `<div class="dota-fantasy-tier-row ${estimated.has(item.metric) ? "tier-estimated" : ""}"><b>${index + 1}</b><span><strong>${esc(item.label)}${estimated.has(item.metric) ? " <i>оценка</i>" : ""}</strong><small>${esc(item.formula)}</small></span><em>${estimated.has(item.metric) ? "≈" : "+"}${fmt(item.value, 0)}</em></div>`).join("")}</section>`;
      }).join("");
      return `<article><h3>${label}</h3>${colorGroups}</article>`;
    }).join("");
    renderSpecialEmblems();
    const roleRanking = role => {
      const configs = dotaFantasyState.configs[role];
      const players = fantasy.rankings.filter(row => row.role_group === role && playoffTeams.has(row.team));
      const scored = players.map(player => {
        const contributions = configs.map(config => {
          const metric = metricLookup.get(`${player.account_id}:${config.metric}`);
          const bonus = metric?.weighted_mean_score != null ? Number(metric.weighted_mean_score) * Number(config.growth) / 100 : 0;
          return {metric: config.metric, bonus};
        });
        const bonus = contributions.reduce((sum, item) => sum + item.bonus, 0);
        return {...player, customBonus: bonus, customTotal: Number(player.base_mean) + bonus};
      });
      return scored.sort((a, b) => b.customTotal - a.customTotal);
    };
    const optionsFor = (role, ownIndex) => {
      const selected = new Set(dotaFantasyState.configs[role].map((item, index) => index === ownIndex ? null : item.metric));
      return rules.map(rule => `<option value="${rule.metric}" ${dotaFantasyState.configs[role][ownIndex].metric === rule.metric ? "selected" : ""} ${selected.has(rule.metric) ? "disabled" : ""}>${esc(rule.label)}${unavailable.has(rule.metric) ? " · нет данных" : estimated.has(rule.metric) ? " · оценка" : ""}</option>`).join("");
    };
    $("dota-fantasy-builders").innerHTML = Object.entries(roleNames).map(([role, label]) => {
      const ranking = roleRanking(role);
      const rankingMarkup = role === "mid"
        ? `<div class="dota-fantasy-custom-ranking"><div class="dota-fantasy-custom-head"><span>Игрок</span><span>База</span><span>Бонус</span><span>Итого</span></div>${ranking.map((player, index) => `<div class="dota-fantasy-custom-row"><b>${index + 1}</b><span><strong>${esc(player.player_name)}</strong><small>${esc(player.team)} · поз. ${player.position}</small></span><em>${fmt(player.base_mean, 0)}</em><em class="bonus">+${fmt(player.customBonus, 0)}</em><em>${fmt(player.customTotal, 0)}</em></div>`).join("")}</div>`
        : (() => {
          const pairs = [];
          for (let first = 0; first < ranking.length; first += 1) for (let second = first + 1; second < ranking.length; second += 1) {
            if (ranking[first].team !== ranking[second].team) continue;
            pairs.push({first: ranking[first], second: ranking[second], total: ranking[first].customTotal + ranking[second].customTotal});
          }
          pairs.sort((a, b) => b.total - a.total);
          const pairRow = (pair, index) => `<div class="dota-fantasy-pair-row"><b>${index + 1}</b><div class="dota-fantasy-pair-players">${[pair.first, pair.second].map(player => `<div><span><strong>${esc(player.player_name)}</strong><small>${esc(player.team)} · поз. ${player.position}</small></span><em>база ${fmt(player.base_mean, 0)} · бонус +${fmt(player.customBonus, 0)} · <strong>${fmt(player.customTotal, 0)}</strong></em></div>`).join("")}</div><div class="dota-fantasy-pair-total"><small>Σ двух игроков</small><strong>${fmt(pair.total, 0)}</strong></div></div>`;
          const rest = pairs.length > 20 ? `<details class="dota-fantasy-more-pairs"><summary>Показать остальные ${pairs.length - 20} пар</summary>${pairs.slice(20).map((pair, index) => pairRow(pair, index + 20)).join("")}</details>` : "";
          return `<div class="dota-fantasy-pair-ranking"><div class="dota-fantasy-pair-head"><span>Пара одной команды · ${pairs.length} вариантов</span><span>Сумма двух</span></div>${pairs.slice(0, 20).map(pairRow).join("")}${rest}</div>`;
        })();
      return `<article class="dota-fantasy-builder-card"><h3>${label}</h3><div class="dota-fantasy-config">${dotaFantasyState.configs[role].map((config, index) => `<div><select data-builder-role="${role}" data-builder-index="${index}">${optionsFor(role, index)}</select><label><input type="number" min="0" max="500" step="10" value="${config.growth}" data-builder-growth-role="${role}" data-builder-growth-index="${index}"><span>% прироста</span></label></div>`).join("")}</div>
        ${rankingMarkup}</article>`;
    }).join("");
    document.querySelectorAll("[data-builder-role]").forEach(select => select.addEventListener("change", () => {
      dotaFantasyState.configs[select.dataset.builderRole][Number(select.dataset.builderIndex)].metric = select.value;
      renderDotaFantasy();
    }));
    document.querySelectorAll("[data-builder-growth-role]").forEach(input => input.addEventListener("change", () => {
      const value = Math.max(0, Math.min(500, Number(input.value) || 0));
      dotaFantasyState.configs[input.dataset.builderGrowthRole][Number(input.dataset.builderGrowthIndex)].growth = value;
      renderDotaFantasy();
    }));
    $("dota-fantasy-reset").onclick = () => { dotaFantasyState.configs = freshDotaFantasyConfigs(); renderDotaFantasy(); };
  }

  function renderSpecialEmblems() {
    const special = data.dotaRules.specialEmblems;
    if (!special) return;
    const watchers = special.watchers;
    const tormentor = special.tormentor;
    $("special-emblem-summary").innerHTML = [
      [watchers.sampleMaps, "карты в пилоте смотрителей", "estimate"],
      [watchers.samplePlayerMaps, "player-map смотрителей", "estimate"],
      [tormentor.events, `убийства Терзателя · ${tormentor.tiMaps} карт`, "observed"],
      [`${fmt(tormentor.mapsWithEventRate * 100, 1)}%`, "карт TI хотя бы с одним Терзателем", "observed"],
    ].map(([value, label, kind]) => `<div class="special-stat ${kind}"><strong>${value}</strong><span>${label}</span></div>`).join("");
    $("watcher-position-body").innerHTML = watchers.positions.map(row => `<tr><td>${esc(row.label)}</td><td>≈${fmt(row.estimatedCaptures, 2)}</td><td><strong>≈${fmt(row.estimatedPoints, 0)}</strong></td><td>${fmt(row.lowPoints, 0)}–${fmt(row.highPoints, 0)}</td></tr>`).join("");
    $("watcher-pairs").innerHTML = watchers.pairs.map(row => `<div><span>${row.role === "core" ? "Два кора" : "Два саппорта"}</span><strong>≈${fmt(row.estimatedPoints, 0)}</strong><small>${fmt(row.lowPoints, 0)}–${fmt(row.highPoints, 0)} очков</small></div>`).join("");
    $("watcher-method").innerHTML = `${watchers.sampleCaptures} захватов на двух картах (${watchers.matches.map(row => `${fmt(row.durationMinutes, 1)} мин`).join(" и ")}) нормализованы к средней карте TI <strong>${fmt(watchers.targetDurationMinutes, 1)} минуты</strong>. Индивидуальные различия игроков пока не моделируются.`;
    $("tormentor-position-body").innerHTML = tormentor.positions.map(row => `<tr><td>${esc(row.label)}</td><td>${row.events}</td><td>${fmt(row.hitRate * 100, 1)}%</td><td><strong>${fmt(row.pointsPerMap, 0)}</strong></td></tr>`).join("");
    const durationMax = Math.max(...tormentor.durationBands.map(row => row.eventsPerMap));
    $("tormentor-duration-bands").innerHTML = `<h4>Событий на карту по длительности</h4>${tormentor.durationBands.map(row => `<div><span>${esc(row.band)} мин <small>${row.maps} карт</small></span><i><b style="width:${row.eventsPerMap / durationMax * 100}%"></b></i><strong>${fmt(row.eventsPerMap, 2)}</strong></div>`).join("")}`;
    const supportPairs = tormentor.playoffPairs.filter(row => row.role === "support").sort((a, b) => b.pointsPerMap - a.pointsPerMap);
    $("tormentor-support-pairs").innerHTML = supportPairs.map((row, index) => `<div class="special-ranking-row"><b>${index + 1}</b><span><strong>${esc(row.team)}</strong><small>${esc(row.players)}</small></span><em>${fmt(row.pointsPerMap, 0)}</em></div>`).join("");
    $("tormentor-player-top").innerHTML = tormentor.topPlayers.slice(0, 12).map((row, index) => `<div class="special-ranking-row"><b>${index + 1}</b><span><strong>${esc(row.player_name)}</strong><small>${esc(row.team)} · поз. ${row.position} · ${fmt(row.nonzero_rate * 100, 0)}% карт</small></span><em>${fmt(row.weighted_mean_score, 0)}</em></div>`).join("");
  }

  function renderDotaRoleTabs() {
    $("dota-role-tabs").innerHTML = Object.entries(dotaRoleNames).map(([role, label]) =>
      `<button class="position-tab ${role === dotaState.role ? "active" : ""}" data-dota-role="${role}" role="tab">${label}</button>`
    ).join("");
    document.querySelectorAll("[data-dota-role]").forEach(button => button.addEventListener("click", () => {
      dotaState.role = button.dataset.dotaRole;
      const currentRule = data.dotaRules.meta.rules.find(rule => rule.metric === dotaState.metric);
      if (!currentRule || !dotaAllowedColors[dotaState.role].includes(currentRule.color)) dotaState.metric = dotaDefaultMetric[dotaState.role];
      renderDotaRules();
    }));
  }

  function renderDotaMetricOptions() {
    const rules = data.dotaRules.meta.rules.filter(rule => dotaAllowedColors[dotaState.role].includes(rule.color));
    $("dota-metric-select").innerHTML = rules.map(rule => {
      const unavailable = data.dotaRules.meta.unavailableMetrics.includes(rule.metric);
      const estimated = (data.dotaRules.meta.estimatedMetrics || []).includes(rule.metric);
      return `<option value="${rule.metric}" ${rule.metric === dotaState.metric ? "selected" : ""} ${unavailable ? "disabled" : ""}>${esc(rule.label)} · ${dotaColorNames[rule.color]}${unavailable ? " · нет данных" : estimated ? " · оценка" : ""}</option>`;
    }).join("");
  }

  function renderDotaFormulaGroups() {
    const unavailable = new Set(data.dotaRules.meta.unavailableMetrics);
    const estimated = new Set(data.dotaRules.meta.estimatedMetrics || []);
    $("dota-formula-groups").innerHTML = ["red", "blue", "green"].map(color => `
      <div class="formula-group formula-${color}">
        <h3>${dotaColorNames[color]}</h3>
        ${data.dotaRules.meta.rules.filter(rule => rule.color === color).map(rule => `
          <div class="formula-item ${unavailable.has(rule.metric) ? "formula-unavailable" : estimated.has(rule.metric) ? "formula-estimated" : ""}">
            <strong>${esc(rule.label)}</strong><span>${esc(rule.formula)}</span>${unavailable.has(rule.metric) ? "<small>нет полного источника</small>" : estimated.has(rule.metric) ? "<small>позиционная оценка по пилоту</small>" : ""}
          </div>`).join("")}
      </div>`).join("");
  }

  function renderDotaRules() {
    if (!data.dotaRules) return;
    renderDotaRoleTabs();
    renderDotaMetricOptions();
    const rule = data.dotaRules.meta.rules.find(item => item.metric === dotaState.metric);
    const query = dotaState.search.trim().toLocaleLowerCase("ru");
    const rows = data.dotaRules.playerMetrics.filter(row =>
      row.role_group === dotaState.role && row.metric === dotaState.metric && row.weighted_mean_score != null &&
      (!query || `${row.player_name} ${row.team}`.toLocaleLowerCase("ru").includes(query))
    ).sort((a, b) => Number(b.weighted_mean_score) - Number(a.weighted_mean_score));
    $("dota-color-label").textContent = dotaColorNames[rule.color].toUpperCase();
    $("dota-ranking-title").textContent = `${rule.label} · ${dotaRoleNames[dotaState.role]}`;
    $("dota-result-count").textContent = `${rows.length} игроков`;
    const isEstimated = (data.dotaRules.meta.estimatedMetrics || []).includes(rule.metric);
    $("dota-metric-summary").innerHTML = `<span>Формула: <strong>${esc(rule.formula)}</strong></span><span>Цвет: <strong class="text-${rule.color}">${dotaColorNames[rule.color]}</strong></span><span>Статус: <strong>${isEstimated ? "оценка по позиции" : "фактические события"}</strong></span>`;
    $("dota-ranking-body").innerHTML = rows.map((row, index) => `<tr>
      <td class="rank-number">${index + 1}</td>
      <td class="player-cell"><strong>${esc(row.player_name)}</strong><span>${esc(row.team)} · позиция ${row.position}</span></td>
      <td>${row.is_estimated ? "модель" : row.observed_maps}</td><td>${row.ti_maps}</td>
      <td>${row.is_estimated ? "≈" : ""}${fmt(row.weighted_mean_value)}</td><td class="value-main">${row.is_estimated ? "≈" : ""}${fmt(row.weighted_mean_score, 0)}</td>
      <td>${row.is_estimated ? `${fmt(row.estimate_low_score, 0)}–${fmt(row.estimate_high_score, 0)}` : fmt(row.weighted_p75_score, 0)}</td><td>${fmt(Number(row.nonzero_rate) * 100, 0)}%</td>
    </tr>`).join("");
    const meta = data.dotaRules.meta;
    const slots = dotaState.role === "core" ? "2 красных + 1 зелёная" : dotaState.role === "mid" ? "1 красная + 1 синяя + 1 зелёная" : "2 синих + 1 зелёная";
    $("dota-rules-scope").innerHTML = `<span><strong>${meta.maps}</strong> карт Tier‑1</span><span><strong>${meta.tiMaps}</strong> карт TI</span><span><strong>${meta.players}</strong> игроков</span><small>${slots}<br>TI-вес: коры ${meta.tiRoleWeights.core}× · мид ${meta.tiRoleWeights.mid}× · поддержка ${meta.tiRoleWeights.support}×</small>`;
  }

  $("data-cutoff").textContent = data.meta.dataCutoff;
  $("roster-checked").textContent = data.meta.rosterChecked;
  $("map-count").textContent = Number(data.meta.playerMapObservations).toLocaleString("ru-RU");
  $("formula-list").innerHTML = formulas.map(f => `<li>${f}</li>`).join("");
  renderPlayoffForecast();
  renderDailyForecast();
  $("search").addEventListener("input", e => {state.search = e.target.value; render();});
  $("sort-select").addEventListener("change", e => {state.sort = e.target.value; render();});
  $("metric-select").addEventListener("change", e => {state.metric = e.target.value; renderExplorer();});
  $("close-player").addEventListener("click", closePlayer);
  document.querySelectorAll(".mode-button").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  $("dota-metric-select").addEventListener("change", event => {dotaState.metric = event.target.value; renderDotaRules();});
  $("dota-search").addEventListener("input", event => {dotaState.search = event.target.value; renderDotaRules();});
  render();
  renderDotaFormulaGroups();
  setView(location.hash === "#ward-map" ? "ward-map" : location.hash === "#dota-fantasy" ? "dota-fantasy" : location.hash === "#dota-rules" ? "dota-rules" : location.hash === "#playoffs" ? "playoffs" : "forecast", false);
})();
