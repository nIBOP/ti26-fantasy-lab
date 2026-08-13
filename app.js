(() => {
  const data = window.FANTASY_DATA;
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
  const $ = (id) => document.getElementById(id);
  const fmt = (value, digits = 2) => value == null || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString("ru-RU", {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  function renderDailyForecast() {
    if (!data.daily) return;
    $("active-day-label").textContent = `Матчи ${data.daily.date.replace(" 2026", "")}`;
    $("daily-title").textContent = `Кого выбрать на игровой день ${data.daily.date.replace(" 2026", "")}`;
    if (data.daily.status === "active") {
      $("hero-day-copy").textContent = "Подбор команды на текущий игровой день — по официальным Swiss-парам Liquipedia.";
      $("daily-eyebrow").textContent = `ПРОГНОЗ НА АКТИВНЫЙ ИГРОВОЙ ДЕНЬ · ${data.daily.date.toLocaleUpperCase("ru")}`;
    }
    if (data.daily.status === "not_published") {
      $("hero-day-copy").textContent = "Liquipedia ещё не опубликовала Swiss-пары следующего раунда. Прогноз временно скрыт, чтобы не показывать устаревшие матчи.";
      $("daily-eyebrow").textContent = `РАСПИСАНИЕ ${data.daily.date.toLocaleUpperCase("ru")} ЕЩЁ НЕ ОПУБЛИКОВАНО`;
      $("daily-copy").hidden = true;
      $("schedule-pending").hidden = false;
      $("schedule-pending").innerHTML = `<strong>Ожидаем официальные пары Swiss</strong><p>В исходнике Liquipedia сейчас нет заполненных матчей на ${esc(data.daily.date)}. Рекомендации за 13 августа убраны. После появления пар страницу нужно пересчитать — угадывать соперников по результатам предыдущего раунда мы не будем.</p><a href="${esc(data.daily.source)}" target="_blank" rel="noopener">Открыть расписание Liquipedia ↗</a>`;
      $("daily-fixtures").hidden = true;
      document.querySelector(".daily-grid").hidden = true;
      return;
    }
    $("daily-fixtures").innerHTML = data.daily.fixtures.map(f => {
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
      const rows = data.daily.players.filter(p => p.role_group === role && p.high_confidence === true).slice(0, 5);
      return `<div class="daily-role"><h4>${label}</h4>${rows.map((p, i) => `
        <div class="daily-player">
          <b>${i + 1}</b><span><strong>${esc(p.player_name)}</strong><small>${esc(p.team)} → ${esc(p.opponent)}</small></span>
          <em>${fmt(p.projected_day_total)}<small class="${Number(p.matchup_delta) >= 0 ? "positive" : "negative"}">${Number(p.matchup_delta) >= 0 ? "+" : ""}${fmt(p.matchup_delta)}</small></em>
        </div>`).join("")}</div>`;
    }).join("");

    const best = data.daily.lineups[0];
    const alternatives = data.daily.lineups.slice(1, 5);
    $("daily-lineup").innerHTML = best ? `<article class="lineup-card">
      <div class="lineup-total"><span>Прогноз</span><strong>${fmt(best.projected_day_total)}</strong><small>Δ матча ${Number(best.matchup_delta) >= 0 ? "+" : ""}${fmt(best.matchup_delta)}</small></div>
      <dl>
        <div><dt>Коры · ${esc(best.core_team)}</dt><dd>${esc(best.cores)}</dd></div>
        <div><dt>Мидер · ${esc(best.mid_team)}</dt><dd>${esc(best.mid)}</dd></div>
        <div><dt>Саппорты · ${esc(best.support_team)}</dt><dd>${esc(best.supports)}</dd></div>
      </dl>
    </article>
    <div class="alternative-list"><h4>Ближайшие альтернативы</h4>${alternatives.map((x, i) => `<div><span>#${i + 2} ${esc(x.core_team)} / ${esc(x.mid)} / ${esc(x.support_team)}</span><strong>${fmt(x.projected_day_total)}</strong></div>`).join("")}</div>` : "—";
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

  $("data-cutoff").textContent = data.meta.dataCutoff;
  $("roster-checked").textContent = data.meta.rosterChecked;
  $("map-count").textContent = Number(data.meta.playerMapObservations).toLocaleString("ru-RU");
  $("formula-list").innerHTML = formulas.map(f => `<li>${f}</li>`).join("");
  renderDailyForecast();
  $("search").addEventListener("input", e => {state.search = e.target.value; render();});
  $("sort-select").addEventListener("change", e => {state.sort = e.target.value; render();});
  $("metric-select").addEventListener("change", e => {state.metric = e.target.value; renderExplorer();});
  $("close-player").addEventListener("click", closePlayer);
  render();
})();
