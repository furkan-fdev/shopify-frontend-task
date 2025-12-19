(() => {
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const parseNumber = (raw, fallback = 0) => {
    if (raw == null || raw === "") return fallback;
    const s = String(raw).trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatMoney = (value, currencySymbol, locale) => {
    try {
      const nf = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 0 });
      return `${currencySymbol}${nf.format(Math.round(value))}`;
    } catch {
      return `${currencySymbol}${Math.round(value)}`;
    }
  };

  const triggerFacetChange = (inputEl) => {
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  };

  function initSlider(root) {
    if (!root || root.dataset.fdevReady === "1") return;

    const track = root.querySelector(".price-slider__track");
    const thumbMin = root.querySelector(".price-slider__thumb--min");
    const thumbMax = root.querySelector(".price-slider__thumb--max");
    const valueMinEl = root.querySelector(".price-slider__value--min");
    const valueMaxEl = root.querySelector(".price-slider__value--max");

    const inputs = root.querySelectorAll(".fdev-filter-price__inputs .field__input");
    const minInput = inputs[0];
    const maxInput = inputs[1];

    if (!track || !thumbMin || !thumbMax || !valueMinEl || !valueMaxEl || !minInput || !maxInput) return;

    root.dataset.fdevReady = "1";

    const currencySymbol = root.dataset.currency || "₺";
    const locale = root.dataset.locale || "tr-TR";
    const rangeMax = parseNumber(root.dataset.max, parseNumber(maxInput.dataset.max, 0));

    let minValue = parseNumber(root.dataset.initialMin, parseNumber(minInput.value, 0));
    let maxValue = parseNumber(root.dataset.initialMax, parseNumber(maxInput.value, rangeMax || 0));

    if (!rangeMax) return;

    if (!maxValue) maxValue = rangeMax;
    if (maxValue > rangeMax) maxValue = rangeMax;
    if (minValue < 0) minValue = 0;
    if (minValue > maxValue) minValue = maxValue;

    const valueToPct = (v) => (v / rangeMax) * 100;
    const pctToValue = (pct) => (pct / 100) * rangeMax;

    const render = () => {
      const minPct = clamp(valueToPct(minValue), 0, 100);
      const maxPct = clamp(valueToPct(maxValue), 0, 100);

      root.style.setProperty("--min-pos", `${minPct}%`);
      root.style.setProperty("--max-pos", `${maxPct}%`);

      valueMinEl.textContent = formatMoney(minValue, currencySymbol, locale);
      valueMaxEl.textContent = formatMoney(maxValue, currencySymbol, locale);
    };

    const commitToInputs = () => {
      minInput.value = String(Math.round(minValue));
      maxInput.value = String(Math.round(maxValue));
      triggerFacetChange(minInput);
      triggerFacetChange(maxInput);

      root.dataset.initialMin = String(Math.round(minValue));
      root.dataset.initialMax = String(Math.round(maxValue));
    };

    const getPctFromEvent = (e) => {
      const rect = track.getBoundingClientRect();
      const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      const x = clientX - rect.left;
      return clamp((x / rect.width) * 100, 0, 100);
    };

    const startDrag = (which, e) => {
      e.preventDefault();

      const move = (ev) => {
        const pct = getPctFromEvent(ev);
        const val = pctToValue(pct);

        if (which === "min") minValue = clamp(val, 0, maxValue);
        else maxValue = clamp(val, minValue, rangeMax);

        render();
      };

      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
        commitToInputs();
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);

      move(e);
    };

    thumbMin.addEventListener("mousedown", (e) => startDrag("min", e));
    thumbMax.addEventListener("mousedown", (e) => startDrag("max", e));
    thumbMin.addEventListener("touchstart", (e) => startDrag("min", e), { passive: false });
    thumbMax.addEventListener("touchstart", (e) => startDrag("max", e), { passive: false });

    track.addEventListener("mousedown", (e) => {
      const v = pctToValue(getPctFromEvent(e));
      const distMin = Math.abs(v - minValue);
      const distMax = Math.abs(v - maxValue);
      startDrag(distMin <= distMax ? "min" : "max", e);
    });

    render();
  }

  function boot(root = document) {
    root.querySelectorAll(".fdev-filter-price").forEach(initSlider);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot(document));
  } else {
    boot(document);
  }

  document.addEventListener("shopify:section:load", () => boot(document));

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches?.(".fdev-filter-price")) initSlider(node);
        node.querySelectorAll?.(".fdev-filter-price").forEach(initSlider);
      }
    }
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
