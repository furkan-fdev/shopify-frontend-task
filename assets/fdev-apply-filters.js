(() => {
  const qs = (root, sel) => root.querySelector(sel);
  const qsa = (root, sel) => Array.from(root.querySelectorAll(sel));

  const lockAutoFacetSubmit = () => {
    const El = customElements.get("facet-filters-form");
    if (!El || El.prototype.__fdevLocked) return;

    El.prototype.__fdevLocked = true;

    const original = El.prototype.onSubmitHandler;

    El.prototype.onSubmitHandler = function (event) {
      const form = this.querySelector("form");
      const isManual = form?.dataset?.fdevManual === "1";
      const allow = form?.dataset?.fdevAllowSubmit === "1";

      if (isManual && !allow) {
        event?.preventDefault?.();
        event?.stopImmediatePropagation?.();
        return false;
      }

      return original ? original.call(this, event) : undefined;
    };
  };

  if (customElements.get("facet-filters-form")) {
    lockAutoFacetSubmit();
  } else {
    customElements.whenDefined("facet-filters-form").then(lockAutoFacetSubmit);
  }

  const formSignature = (form) => {
    const fd = new FormData(form);
    return new URLSearchParams(fd).toString();
  };

  const setBaseline = (form) => {
    form.dataset.fdevBaseline = formSignature(form);
  };

  const isDirty = (form) => {
    return (form.dataset.fdevBaseline || "") !== formSignature(form);
  };

  const updateApplyButtons = (form) => {
    const id = form.id;
    if (!id) return;

    const btns = qsa(document, `[data-fdev-apply="${CSS.escape(id)}"]`);
    const dirty = isDirty(form);

    btns.forEach((b) => {
      b.disabled = !dirty;
      b.classList.toggle("is-active", dirty);
    });
  };

  const syncInputUI = (input) => {
    if (!(input instanceof HTMLInputElement)) return;

    if (input.type === "checkbox" || input.type === "radio") {
      const label =
        input.closest("label") ||
        input.closest(".facets__label") ||
        input.closest(".mobile-facets__label") ||
        input.closest(".facet-checkbox");

      if (label) label.classList.toggle("active", input.checked);
    }
  };

  const attachForm = (form) => {
    if (!form || form.dataset.fdevApplyReady === "1") return;
    form.dataset.fdevApplyReady = "1";

    setBaseline(form);
    updateApplyButtons(form);

    const onAnyInput = (e) => {
      syncInputUI(e.target);
      updateApplyButtons(form);
    };

    form.addEventListener("change", onAnyInput);
    form.addEventListener("input", onAnyInput);

  };

  const attachApplyButtons = () => {
    qsa(document, "[data-fdev-apply]").forEach((btn) => {
      if (btn.dataset.fdevBtnReady === "1") return;
      btn.dataset.fdevBtnReady = "1";

      const formId = btn.getAttribute("data-fdev-apply");
      const form = document.getElementById(formId);
      if (!form) return;

      updateApplyButtons(form);

      btn.addEventListener("click", () => {
        if (!isDirty(form)) return;

        form.dataset.fdevAllowSubmit = "1";

        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.submit();
        }

        setTimeout(() => {
          delete form.dataset.fdevAllowSubmit;
        }, 0);
      });
    });
  };

  const boot = () => {
    attachForm(document.getElementById("FacetFiltersForm"));
    attachForm(document.getElementById("FacetFiltersFormMobile"));
    attachApplyButtons();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("shopify:section:load", boot);

  const obs = new MutationObserver(() => boot());
  obs.observe(document.documentElement, { subtree: true, childList: true });
})();
