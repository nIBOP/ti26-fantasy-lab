(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const stageLabels = ["Подготовка", "Лейнинг 0–10", "Ранняя 10–20", "Мидгейм 20–30", "Поздняя 30–40", "Очень поздняя 40+"];
  const normalizationLabels = {
    absolute: "установок",
    "player-map": "установок / player-map",
    "10-minutes": "установок / 10 player-minutes"
  };
  const state = {
    loaded: false, loading: false, player: "all", compare: "none", team: "all",
    role: "all", type: "all", stage: "all", ti: "1", side: "all",
    result: "all", patch: "all", mode: "heat", normalization: "absolute",
    cells: null, loadStarted: 0,
    perf: {load: null, parse: null, filter: null, aggregate: null, draw: null}
  };

  function option(value, label) {
    return `<option value="${esc(value)}">${esc(label)}</option>`;
  }

  function load() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    state.loadStarted = performance.now();
    const script = document.createElement("script");
    const source = new URL("ward-data.js", location.href).href;
    script.src = source;
    script.onload = () => {
      const readyAt = performance.now();
      const resource = performance.getEntriesByName(source).at(-1);
      state.perf.load = resource ? resource.responseEnd - resource.startTime : readyAt - state.loadStarted;
      state.perf.parse = resource ? Math.max(0, readyAt - resource.responseEnd) : null;
      state.loaded = true;
      state.loading = false;
      init();
    };
    script.onerror = () => {
      state.loading = false;
      $("ward-scope").textContent = "Не удалось загрузить ward-data.js";
    };
    document.head.appendChild(script);
  }

  function init() {
    const data = window.WARD_DATA;
    if (!data || data.version < 2) throw new Error("ward-data.js must be rebuilt with payload version 2");
    const playerOptions = data.players.map((player, index) => option(index, `${player[1]} · ${player[2]}`)).join("");
    $("ward-player").innerHTML = option("all", "Все игроки") + playerOptions;
    $("ward-compare").innerHTML = option("none", "Не сравнивать") + playerOptions;
    $("ward-team").innerHTML = option("all", "Все команды") + data.teams.map((name, index) => option(index, name)).join("");
    $("ward-role").innerHTML = option("all", "Все позиции") +
      [1, 2, 3, 4, 5].map(position => option(position, `Позиция ${position}`)).join("") +
      option("unknown", "Роль неизвестна");
    $("ward-stage").innerHTML = option("all", "Все стадии") +
      data.stages.map((stage, index) => option(index, stageLabels[index])).join("");
    $("ward-patch").innerHTML = option("all", "Все патчи") +
      data.patches.map((patch, index) => option(index, `Патч ${patch}`)).join("");
    $("ward-scope").innerHTML =
      `<span><strong>${data.summary.matches.toLocaleString("ru-RU")}</strong>уникальных матчей Tier-1</span>` +
      `<span><strong>${data.summary.tiMatches}</strong>уникальных матчей TI</span>` +
      `<span><strong>${data.summary.observer.toLocaleString("ru-RU")}</strong>Observer</span>` +
      `<span><strong>${data.summary.sentry.toLocaleString("ru-RU")}</strong>Sentry</span>`;

    ["player", "compare", "team", "role", "type", "stage", "ti", "side", "result", "patch", "mode", "normalization"].forEach(key => {
      $("ward-" + key).addEventListener("change", event => {
        state[key] = event.target.value;
        if (key === "player" && state.compare === state.player) {
          state.compare = "none";
          $("ward-compare").value = "none";
        }
        render();
      });
    });
    $("ward-canvas").addEventListener("mousemove", tooltip);
    $("ward-canvas").addEventListener("mouseleave", () => $("ward-tooltip").hidden = true);
    window.addEventListener("resize", () => {
      state.perf.draw = draw();
      renderPerformance();
    });
    render();
  }

  function playerPass(index, targetPlayer) {
    const player = window.WARD_DATA.players[index];
    if (targetPlayer !== "all" && index !== Number(targetPlayer)) return false;
    if (state.role === "unknown" && player[3] != null) return false;
    if (state.role !== "all" && state.role !== "unknown" && player[3] !== Number(state.role)) return false;
    return true;
  }

  function binPass(row, targetPlayer) {
    return playerPass(row[1], targetPlayer) &&
      (state.team === "all" || row[2] === Number(state.team)) &&
      (state.type === "all" || row[3] === (state.type === "observer" ? 0 : 1)) &&
      (state.stage === "all" || row[4] === Number(state.stage)) &&
      (state.ti === "all" || row[5] === 1) &&
      (state.side === "all" || row[6] === (state.side === "radiant" ? 0 : 1)) &&
      (state.result === "all" || row[7] === (state.result === "win" ? 1 : 0)) &&
      (state.patch === "all" || row[8] === Number(state.patch));
  }

  function gamePass(row, targetPlayer) {
    if (!playerPass(row[1], targetPlayer)) return false;
    if (state.team !== "all" && row[2] !== Number(state.team)) return false;
    if (state.ti !== "all" && row[3] !== 1) return false;
    if (state.side !== "all" && row[4] !== (state.side === "radiant" ? 0 : 1)) return false;
    if (state.result !== "all" && row[5] !== (state.result === "win" ? 1 : 0)) return false;
    if (state.patch !== "all" && row[6] !== Number(state.patch)) return false;
    if (state.stage !== "all") {
      const bounds = window.WARD_DATA.stageBounds[Number(state.stage)];
      if (bounds[0] != null && row[7] <= bounds[0]) return false;
    }
    return true;
  }

  function filterSelection(targetPlayer) {
    const bins = [];
    const games = [];
    for (const row of window.WARD_DATA.bins) if (binPass(row, targetPlayer)) bins.push(row);
    for (const row of window.WARD_DATA.games) if (gamePass(row, targetPlayer)) games.push(row);
    return {bins, games};
  }

  function minutesForGame(game) {
    const duration = game[7];
    if (state.stage === "all") return duration / 60;
    const [start, end] = window.WARD_DATA.stageBounds[Number(state.stage)];
    if (start == null) return 0;
    return Math.max(0, Math.min(duration, end == null ? duration : end) - start) / 60;
  }

  function aggregate(filtered) {
    const rawGrid = new Float64Array(4096);
    const lifetimes = [];
    const placementMatches = new Set();
    const uniqueMatches = new Set();
    const patches = new Set();
    let placements = 0;
    let destroyed = 0;
    let classified = 0;
    let survived = 0;
    for (const row of filtered.bins) {
      const count = row[11];
      rawGrid[row[10] * 64 + row[9]] += count;
      placements += count;
      placementMatches.add(row[0]);
      patches.add(row[8]);
      if (row[12] != null) lifetimes.push([row[12], count]);
      destroyed += row[13];
      classified += row[14];
      survived += row[15];
    }
    let playerMinutes = 0;
    for (const game of filtered.games) {
      uniqueMatches.add(game[0]);
      playerMinutes += minutesForGame(game);
    }
    lifetimes.sort((a, b) => a[0] - b[0]);
    const lifetimeCount = lifetimes.reduce((sum, item) => sum + item[1], 0);
    let cumulative = 0;
    let median = null;
    for (const item of lifetimes) {
      cumulative += item[1];
      if (cumulative >= lifetimeCount / 2) {
        median = item[0];
        break;
      }
    }
    return {
      rawGrid, placements, placementMatches: placementMatches.size,
      uniqueMatches: uniqueMatches.size, playerMaps: filtered.games.length,
      playerMinutes, median, destroyed, classified, survived,
      unknown: placements - classified - survived, patches
    };
  }

  function normalizationDivisor(result) {
    if (state.normalization === "player-map") return result.playerMaps;
    if (state.normalization === "10-minutes") return result.playerMinutes / 10;
    return 1;
  }

  function displayGrid(result) {
    const divisor = normalizationDivisor(result);
    const grid = new Float64Array(4096);
    if (!divisor) return grid;
    for (let index = 0; index < 4096; index++) grid[index] = result.rawGrid[index] / divisor;
    return grid;
  }

  function gridMaximum(grid) {
    let maximum = 0;
    for (let index = 0; index < 4096; index++) if (grid[index] > maximum) maximum = grid[index];
    return maximum;
  }

  function render() {
    const filterStarted = performance.now();
    const primaryFiltered = filterSelection(state.player);
    const comparisonFiltered = state.compare === "none" ? null : filterSelection(state.compare);
    state.perf.filter = performance.now() - filterStarted;

    const aggregateStarted = performance.now();
    const primary = aggregate(primaryFiltered);
    const comparison = comparisonFiltered ? aggregate(comparisonFiltered) : null;
    primary.grid = displayGrid(primary);
    if (comparison) comparison.grid = displayGrid(comparison);
    const commonMax = Math.max(gridMaximum(primary.grid), comparison ? gridMaximum(comparison.grid) : 0);
    state.cells = {primary, comparison, commonMax};
    state.perf.aggregate = performance.now() - aggregateStarted;
    state.perf.draw = draw();

    stats(primary, comparison);
    chips();
    warnings(primary);
    renderPerformance();
  }

  function warnings(primary) {
    const messages = [];
    if (primary.playerMaps < 10) messages.push(`Маленькая выборка: ${primary.playerMaps} player-maps.`);
    if (primary.patches.size > 1) {
      messages.push(`Смешаны патчи ${[...primary.patches].map(index => window.WARD_DATA.patches[index]).join(" и ")}; координаты показаны только на нейтральной сетке.`);
    }
    if (state.normalization === "10-minutes" && !primary.playerMinutes) {
      messages.push("Нормализация на игровые минуты не определена для стадии подготовки.");
    }
    const warning = $("ward-warning");
    warning.hidden = !messages.length;
    warning.querySelector("p").textContent = messages.join(" ");
  }

  function drawCoordinateBase(context, size) {
    context.fillStyle = "#0b1211";
    context.fillRect(0, 0, size, size);
    const cell = size / 64;
    for (let line = 0; line <= 64; line++) {
      const major = line % 8 === 0;
      context.beginPath();
      context.strokeStyle = major ? "rgba(151,188,174,.20)" : "rgba(151,188,174,.055)";
      context.lineWidth = major ? 1 : 0.5;
      context.moveTo(line * cell, 0);
      context.lineTo(line * cell, size);
      context.moveTo(0, line * cell);
      context.lineTo(size, line * cell);
      context.stroke();
    }
    context.fillStyle = "rgba(194,215,204,.45)";
    context.font = `${Math.max(9, size / 90)}px ui-monospace, monospace`;
    context.fillText("x: 0", 8, size - 8);
    context.fillText("x: 1", size - 34, size - 8);
    context.fillText("y: 0", 8, 15);
    context.fillText("y: 1", 8, size - 22);
  }

  function draw() {
    const started = performance.now();
    if (!state.cells) return 0;
    const canvas = $("ward-canvas");
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.max(320, Math.round(box.width * ratio));
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const context = canvas.getContext("2d");
    const cell = size / 64;
    drawCoordinateBase(context, size);

    const renderGrid = (grid, color, commonMax) => {
      if (!commonMax) return;
      if (state.mode === "cells") {
        for (let index = 0; index < 4096; index++) if (grid[index]) {
          const alpha = 0.12 + 0.78 * Math.sqrt(grid[index] / commonMax);
          context.fillStyle = color(alpha);
          context.fillRect((index % 64) * cell, Math.floor(index / 64) * cell, cell + 0.4, cell + 0.4);
        }
      } else {
        context.globalCompositeOperation = "lighter";
        for (let index = 0; index < 4096; index++) if (grid[index]) {
          const ratioToMax = grid[index] / commonMax;
          const x = (index % 64 + 0.5) * cell;
          const y = (Math.floor(index / 64) + 0.5) * cell;
          const radius = cell * (1.8 + 4 * Math.sqrt(ratioToMax));
          const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, color(0.95 * Math.pow(ratioToMax, 0.35)));
          gradient.addColorStop(0.45, color(0.35 * Math.pow(ratioToMax, 0.3)));
          gradient.addColorStop(1, color(0));
          context.fillStyle = gradient;
          context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        context.globalCompositeOperation = "source-over";
      }
    };
    renderGrid(state.cells.primary.grid, alpha => `rgba(255,96,58,${alpha})`, state.cells.commonMax);
    if (state.cells.comparison) {
      renderGrid(state.cells.comparison.grid, alpha => `rgba(40,211,230,${alpha})`, state.cells.commonMax);
    }
    canvas.dataset.scaleMax = String(state.cells.commonMax);
    canvas.dataset.primaryMax = String(gridMaximum(state.cells.primary.grid));
    canvas.dataset.comparisonMax = String(state.cells.comparison ? gridMaximum(state.cells.comparison.grid) : 0);
    $("ward-scale-label").textContent =
      `общая шкала 0–${formatValue(state.cells.commonMax)} ${normalizationLabels[state.normalization]}`;
    return performance.now() - started;
  }

  function formatValue(value, digits = 2) {
    return Number(value || 0).toLocaleString("ru-RU", {maximumFractionDigits: digits});
  }

  function statCard(label, value, note, wide = false) {
    return `<div class="ward-stat${wide ? " wide" : ""}"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
  }

  function stats(primary, comparison) {
    const perPlayerMap = primary.playerMaps ? primary.placements / primary.playerMaps : null;
    const perTenMinutes = primary.playerMinutes ? primary.placements * 10 / primary.playerMinutes : null;
    const selected = state.player === "all" ? "Все игроки" : window.WARD_DATA.players[Number(state.player)][1];
    const playerMeta = state.player === "all" ? "Совокупная выборка" :
      `${window.WARD_DATA.players[Number(state.player)][2]} · позиция ${window.WARD_DATA.players[Number(state.player)][3] || "неизвестна"}`;
    let html = statCard("Выбранный игрок", esc(selected), esc(playerMeta), true) +
      statCard("Установки", primary.placements.toLocaleString("ru-RU"), `${primary.placementMatches} матчей с установкой`) +
      statCard("Уникальные матчи", primary.uniqueMatches.toLocaleString("ru-RU"), "каждый match_id считается один раз") +
      statCard("Player-maps", primary.playerMaps.toLocaleString("ru-RU"), "пары account_id × match_id") +
      statCard("Player-minutes", formatValue(primary.playerMinutes, 0), "игровое время выбранной стадии") +
      statCard("На одну player-map", perPlayerMap == null ? "unknown" : formatValue(perPlayerMap), "установки / player-maps") +
      statCard("На 10 игровых минут", perTenMinutes == null ? "unknown" : formatValue(perTenMinutes), "установки × 10 / player-minutes") +
      statCard("Медиана жизни", primary.median == null ? "unknown" : `${Math.round(primary.median)} с`, "по известным временам") +
      statCard("Досрочно уничтожены", primary.classified ? `${Math.round(primary.destroyed / primary.classified * 100)}%` : "unknown", `${primary.classified} destroyed/expired`) +
      statCard("Дожили до конца", primary.survived.toLocaleString("ru-RU"), "отдельный исход, не destroyed") +
      statCard("Удаление unknown", primary.unknown.toLocaleString("ru-RU"), "не входит в классификацию");
    if (comparison) {
      const compared = window.WARD_DATA.players[Number(state.compare)];
      const comparedPerMap = comparison.playerMaps ? comparison.placements / comparison.playerMaps : null;
      html += statCard("Сравнение · бирюзовый слой", esc(compared[1]),
        `${comparison.placements} установок · ${comparison.uniqueMatches} матчей · ${comparison.playerMaps} player-maps · ${comparedPerMap == null ? "unknown" : formatValue(comparedPerMap)} на player-map`, true);
    }
    $("ward-stats").innerHTML = html;
  }

  function chips() {
    const labels = [];
    [
      ["player", "Игрок"], ["team", "Команда"], ["role", "Позиция"], ["type", "Тип"],
      ["stage", "Стадия"], ["ti", "Выборка"], ["side", "Сторона"], ["result", "Результат"],
      ["patch", "Патч"], ["normalization", "Нормализация"]
    ].forEach(([key, label]) => {
      const element = $("ward-" + key);
      labels.push(`<span>${label}: ${esc(element.options[element.selectedIndex].text)}</span>`);
    });
    $("ward-filter-chips").innerHTML = labels.join("");
  }

  function renderPerformance() {
    const metric = (label, value) =>
      `<span><small>${label}</small><strong>${value == null ? "n/a" : formatValue(value, 1) + " мс"}</strong></span>`;
    $("ward-performance").innerHTML =
      metric("загрузка", state.perf.load) +
      metric("разбор JS", state.perf.parse) +
      metric("фильтрация", state.perf.filter) +
      metric("агрегация", state.perf.aggregate) +
      metric("отрисовка", state.perf.draw);
  }

  function tooltip(event) {
    if (!state.cells) return;
    const canvas = $("ward-canvas");
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(63, Math.floor((event.clientX - rect.left) / rect.width * 64)));
    const y = Math.max(0, Math.min(63, Math.floor((event.clientY - rect.top) / rect.height * 64)));
    const index = y * 64 + x;
    const primaryRaw = state.cells.primary.rawGrid[index];
    const primaryValue = state.cells.primary.grid[index];
    const comparisonRaw = state.cells.comparison?.rawGrid[index] || 0;
    const comparisonValue = state.cells.comparison?.grid[index] || 0;
    const tip = $("ward-tooltip");
    if (!primaryRaw && !comparisonRaw) {
      tip.hidden = true;
      return;
    }
    tip.hidden = false;
    tip.innerHTML = `<strong>Клетка ${x + 1} × ${y + 1}</strong>` +
      `${primaryRaw} установок · ${formatValue(primaryValue)} ${normalizationLabels[state.normalization]}` +
      (state.cells.comparison ? `<br>${comparisonRaw} · ${formatValue(comparisonValue)} у сравниваемого игрока` : "");
    tip.style.left = Math.min(rect.width - 180, event.clientX - rect.left + 12) + "px";
    tip.style.top = Math.max(8, event.clientY - rect.top - 56) + "px";
  }

  window.addEventListener("ward-map:show", load);
  if (location.hash === "#ward-map") load();
})();
