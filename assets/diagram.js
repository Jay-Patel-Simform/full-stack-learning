/* Renders <pre class="mermaid"> blocks in every lesson and reference page.
   Markup contract:
     <figure class="fig">
       <pre class="mermaid">flowchart LR ...</pre>
       <figcaption>What the picture says.</figcaption>
     </figure>
   Load assets/vendor/mermaid.min.js first, then this file. Both are plain
   <script> tags on purpose: an ES module import is blocked when the page is
   opened from file://, and a local copy needs no network at all.
   Colours are read off lesson.css, so the diagram follows light/dark. */
(function () {
  if (typeof mermaid === "undefined") return;

  var css = getComputedStyle(document.documentElement);
  function v(name, fallback) {
    return css.getPropertyValue(name).trim() || fallback;
  }

  var ink = v("--ink", "#1c1a17");
  var bg = v("--bg", "#fffdf9");
  var rule = v("--rule", "#e2dcd1");
  var muted = v("--muted", "#5f5a52");
  var accent = v("--accent", "#8a3324");
  var codeBg = v("--code-bg", "#f4f0e8");
  var mono = v("--mono", "monospace");

  // Dark mode needs mermaid's own darkMode flag, or it computes light contrasts.
  var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") dark = true;
  if (theme === "light") dark = false;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    fontFamily: mono,
    flowchart: { curve: "basis", htmlLabels: true, useMaxWidth: true },
    sequence: { useMaxWidth: true, mirrorActors: false, wrap: true },
    themeVariables: {
      darkMode: dark,
      background: bg,
      primaryColor: codeBg,
      primaryTextColor: ink,
      primaryBorderColor: rule,
      secondaryColor: bg,
      tertiaryColor: bg,
      lineColor: muted,
      textColor: ink,
      mainBkg: codeBg,
      nodeBorder: rule,
      clusterBkg: "transparent",
      clusterBorder: rule,
      edgeLabelBackground: bg,
      labelBoxBkgColor: codeBg,
      labelBoxBorderColor: rule,
      labelTextColor: ink,
      actorBkg: codeBg,
      actorBorder: rule,
      actorTextColor: ink,
      actorLineColor: rule,
      signalColor: ink,
      signalTextColor: ink,
      noteBkgColor: bg,
      noteBorderColor: accent,
      noteTextColor: muted,
      sequenceNumberColor: bg,
      activationBkgColor: accent,
      activationBorderColor: accent,
      attributeBackgroundColorOdd: bg,
      attributeBackgroundColorEven: codeBg,
      fontSize: "14px",
    },
  });

  // run() rather than startOnLoad: this file loads at the end of <body>,
  // so the load event may already have fired.
  mermaid.run({ querySelector: "pre.mermaid" });
})();
