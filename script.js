// Optional: set FormSubmit redirect to same page after sending
const form = document.getElementById("estimateForm");
if (form) {
  const next = form.querySelector('input[name="_next"]');
  if (next) next.value = window.location.href + "#estimate";
}
