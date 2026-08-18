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
  const dotaFantasyState = {role: "core", search: "", selected: null};
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
    $("dota-fantasy-role-tabs").innerHTML = Object.entries(roleNames).map(([role, label]) =>
      `<button class="position-tab ${role === dotaFantasyState.role ? "active" : ""}" data-dota-fantasy-role="${role}" role="tab">${label}</button>`
    ).join("");
    document.querySelectorAll("[data-dota-fantasy-role]").forEach(button => button.addEventListener("click", () => {
      dotaFantasyState.role = button.dataset.dotaFantasyRole;
      dotaFantasyState.selected = null;
      renderDotaFantasy();
    }));
    const meta = fantasy.meta;
    $("dota-fantasy-scope").innerHTML = `<span><strong>${meta.maps}</strong> карт Tier‑1</span><span><strong>${meta.tiMaps}</strong> карт TI</span><span><strong>${meta.players}</strong> игроков</span>`;
    $("dota-fantasy-emblems").innerHTML = Object.entries(meta.emblems).map(([role, emblems]) => `<article>
      <h3>${roleNames[role]}</h3>${emblems.map(item => `<div><strong>${esc(item.name)}</strong><span>${fmt(Number(item.total_multiplier) * 100, 0)}% · ${esc(item.tier)} · ${esc(item.property)}</span></div>`).join("")}
    </article>`).join("");
    const lineup = meta.suggestedLineup;
    const lineupPlayers = role => lineup[role].map(player => `<strong>${esc(player.player_name)}</strong> <span>${esc(player.team)}</span>`).join(" + ");
    $("dota-fantasy-lineup").innerHTML = `<div><span>Основа</span>${lineupPlayers("core")}</div><div><span>Центр</span>${lineupPlayers("mid")}</div><div><span>Поддержка</span>${lineupPlayers("support")}</div>`;
    const query = dotaFantasyState.search.trim().toLocaleLowerCase("ru");
    const rows = fantasy.rankings.filter(row => row.role_group === dotaFantasyState.role && (!query || `${row.player_name} ${row.team}`.toLocaleLowerCase("ru").includes(query)))
      .sort((a, b) => Number(a.rank) - Number(b.rank));
    $("dota-fantasy-ranking-title").textContent = roleNames[dotaFantasyState.role];
    $("dota-fantasy-result-count").textContent = `${rows.length} игроков`;
    $("dota-fantasy-ranking-body").innerHTML = rows.map(row => `<tr class="${Number(row.account_id) === dotaFantasyState.selected ? "selected" : ""}" data-dota-fantasy-account="${row.account_id}">
      <td class="rank-number">${row.rank}</td><td class="player-cell"><strong>${esc(row.player_name)}</strong><span>${esc(row.team)} · позиция ${row.position}</span></td>
      <td>${row.maps}</td><td>${fmt(row.base_mean, 0)}</td><td>+${fmt(row.emblem_bonus_mean, 0)}</td><td class="value-main">${fmt(row.total_mean, 0)}</td><td>${fmt(row.model_score, 0)}</td><td><span class="aspect-badge">${esc(row.best_emblem)} · +${fmt(row.best_emblem_bonus, 0)}</span></td>
    </tr>`).join("");
    document.querySelectorAll("[data-dota-fantasy-account]").forEach(row => row.addEventListener("click", () => {
      dotaFantasyState.selected = Number(row.dataset.dotaFantasyAccount);
      renderDotaFantasy();
    }));
    if (dotaFantasyState.selected != null) {
      const player = fantasy.rankings.find(row => Number(row.account_id) === dotaFantasyState.selected);
      $("dota-fantasy-player-empty").hidden = true; $("dota-fantasy-player-content").hidden = false;
      $("dota-fantasy-player-role").textContent = roleNames[player.role_group].toUpperCase();
      $("dota-fantasy-player-name").textContent = player.player_name;
      $("dota-fantasy-player-team").textContent = `${player.team} · ${player.maps} карт`;
      $("dota-fantasy-breakdown").innerHTML = fantasy.breakdown.filter(item => Number(item.account_id) === dotaFantasyState.selected).map(item => `<div class="dota-fantasy-breakdown-row ${item.covered ? "" : "metric-missing"}">
        <span><strong>${esc(item.name)}</strong><small>${fmt(Number(item.total_multiplier) * 100, 0)}% · ${esc(item.tier)} · ${esc(item.property)}</small></span><b>${item.covered ? `+${fmt(item.bonus_mean_score, 0)}` : "нет данных"}</b>
      </div>`).join("");
    } else {
      $("dota-fantasy-player-empty").hidden = false; $("dota-fantasy-player-content").hidden = true;
    }
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
      return `<option value="${rule.metric}" ${rule.metric === dotaState.metric ? "selected" : ""} ${unavailable ? "disabled" : ""}>${esc(rule.label)} · ${dotaColorNames[rule.color]}${unavailable ? " · нет данных" : ""}</option>`;
    }).join("");
  }

  function renderDotaFormulaGroups() {
    const unavailable = new Set(data.dotaRules.meta.unavailableMetrics);
    $("dota-formula-groups").innerHTML = ["red", "blue", "green"].map(color => `
      <div class="formula-group formula-${color}">
        <h3>${dotaColorNames[color]}</h3>
        ${data.dotaRules.meta.rules.filter(rule => rule.color === color).map(rule => `
          <div class="formula-item ${unavailable.has(rule.metric) ? "formula-unavailable" : ""}">
            <strong>${esc(rule.label)}</strong><span>${esc(rule.formula)}</span>${unavailable.has(rule.metric) ? "<small>нет полного источника</small>" : ""}
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
    $("dota-metric-summary").innerHTML = `<span>Формула: <strong>${esc(rule.formula)}</strong></span><span>Цвет: <strong class="text-${rule.color}">${dotaColorNames[rule.color]}</strong></span><span>Сортировка: <strong>взвешенное среднее</strong></span>`;
    $("dota-ranking-body").innerHTML = rows.map((row, index) => `<tr>
      <td class="rank-number">${index + 1}</td>
      <td class="player-cell"><strong>${esc(row.player_name)}</strong><span>${esc(row.team)} · позиция ${row.position}</span></td>
      <td>${row.observed_maps}</td><td>${row.ti_maps}</td>
      <td>${fmt(row.weighted_mean_value)}</td><td class="value-main">${fmt(row.weighted_mean_score, 0)}</td>
      <td>${fmt(row.weighted_p75_score, 0)}</td><td>${fmt(Number(row.nonzero_rate) * 100, 0)}%</td>
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
  $("dota-fantasy-search").addEventListener("input", event => {dotaFantasyState.search = event.target.value; renderDotaFantasy();});
  render();
  renderDotaFormulaGroups();
  setView(location.hash === "#ward-map" ? "ward-map" : location.hash === "#dota-fantasy" ? "dota-fantasy" : location.hash === "#dota-rules" ? "dota-rules" : location.hash === "#playoffs" ? "playoffs" : "forecast", false);
})();
