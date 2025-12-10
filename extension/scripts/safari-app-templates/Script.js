function show(enabled, useSettingsInsteadOfPreferences) {
  // The HTML already uses "Settings" terminology, no text changes needed

  if (typeof enabled === "boolean") {
    document.body.classList.toggle("state-on", enabled)
    document.body.classList.toggle("state-off", !enabled)
  } else {
    document.body.classList.remove("state-on")
    document.body.classList.remove("state-off")
  }
}

function openPreferences() {
  webkit.messageHandlers.controller.postMessage("open-preferences")
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences)
