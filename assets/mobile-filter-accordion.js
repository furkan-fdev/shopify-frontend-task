document.addEventListener("click", function (e) {
  if (e.target.closest(".mobile-color-swatch")) {
    const label = e.target.closest(".mobile-color-swatch");
    label.classList.toggle("active");
  }
});
