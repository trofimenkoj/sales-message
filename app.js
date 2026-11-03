(function () {
  "use strict";
  const D = window.SALES_DATA;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("uk-UA").replace(/ /g, " ");

  const PAY = [
    { key: "9", def: true, label: (a) => `щомісяця — ${fmt(a)} грн (9 платежів на рік)` },
    { key: "3", def: true, label: (a) => `3 рази на рік — ${fmt(a)} грн` },
    { key: "2", def: false, label: (a) => `2 рази на рік — ${fmt(a)} грн` },
    { key: "1", def: false, label: (a) => `раз на рік — ${fmt(a)} грн` },
    { key: "full", def: true, label: (a) => `весь курс одразу — ${fmt(a)} грн` },
  ];

  function years(months) {
    const y = Math.round(months / 12);
    const w = y % 10 === 1 && y % 100 !== 11 ? "рік"
      : [2, 3, 4].includes(y % 10) && ![12, 13, 14].includes(y % 100) ? "роки" : "років";
    return `${y} ${w}`;
  }
  const productLabel = (p) => `${p.title} · ${p.format} · ${years(p.months)}`;

  // ---------- форма ----------
  const sel = $("product");
  D.products.forEach((p, i) => sel.add(new Option(productLabel(p), i)));
  let productTouched = false;
  sel.addEventListener("change", () => { productTouched = true; });

  const payBox = $("payChecks");
  PAY.forEach((o) => {
    const l = document.createElement("label");
    l.innerHTML = `<input type="checkbox" data-pay="${o.key}" ${o.def ? "checked" : ""}> <span></span>`;
    payBox.appendChild(l);
  });

  // Автовибір програми за віком і днями, поки менеджер не вибрав сам.
  function autoPick() {
    if (productTouched) return;
    const age = parseInt($("age").value, 10);
    const days = $("days").value.toLowerCase();
    const weekend = /сб|суб|нд|нед|вихід/.test(days);
    const format = weekend ? "вихідні" : "будні";
    let title = null;
    if (age >= 9 && age <= 12) title = "МКА 9–12 років";
    else if (age >= 13 && age <= 14) title = "МКА 13–14 років";
    const i = D.products.findIndex((p) => (!title || p.title === title) && p.format === format);
    if (i >= 0) sel.value = i;
  }

  // Ім'я і телефон менеджера запам'ятовуються в браузері.
  const store = {
    get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  ["manager", "phone"].forEach((k) => {
    $(k).value = store.get("sm_" + k);
    $(k).addEventListener("input", () => store.set("sm_" + k, $(k).value));
  });

  // ---------- шаблони ----------
  const GREET = ["Добрий день", "Вітаю", "Доброго дня"];
  const THANKS = [
    "Дякую за приємну розмову! Як і домовлялися, надсилаю всю інформацію в одному повідомленні.",
    "Дякую, що знайшли час поспілкуватися. Нижче — все, що ми обговорили, щоб було під рукою.",
    "Приємно було поспілкуватися! Збираю для Вас головне, щоб Ви могли спокійно все обдумати.",
  ];
  const BYE = ["Гарного дня! 😊", "Із задоволенням відповім на будь-які запитання.", "На зв'язку! 🙌"];

  let variant = 0;
  let len = "std";
  const pick = (arr) => arr[variant % arr.length];

  function nextStep(p, f) {
    const addr = D.branch.address ? ` за адресою ${D.branch.address}` : "";
    switch (f.step) {
      case "trial":
        return "Пропоную почати з пробного заняття — так дитина відчує атмосферу, а Ви побачите, як проходять уроки. " +
          (f.when ? `Записати на пробне заняття ${f.when}? Достатньо відповісти «так» 🙂` : "Коли Вам зручно прийти?");
      case "contract":
        return `Щоб закріпити місце в групі, залишилось оформити договір і внести вступний внесок (${fmt(p.entranceFee)} грн).` +
          (f.when ? ` Чекаю Вас ${f.when}${addr}. Підтвердите?` : " Коли Вам зручно це зробити?");
      case "visit":
        return `Запрошую Вас у філію${addr}: покажу класи і відповім на всі запитання.` +
          (f.when ? ` Пропоную ${f.when} — Вам зручно?` : " Коли Вам зручно під'їхати?");
      default:
        return "Якщо з'являться запитання — пишіть, я на зв'язку." +
          (f.when ? ` Наберу Вас ${f.when}, щоб обговорити деталі. Добре?` : "");
    }
  }

  function build() {
    const f = {};
    ["client", "child", "age", "interests", "important", "days", "time", "start", "step", "when", "promo", "manager", "phone"]
      .forEach((k) => (f[k] = $(k).value.trim()));
    const p = D.products[sel.value];
    const dir = D.directions[p.direction] || { name: "", about: "", benefits: [] };
    const warn = [];

    // ціна для підказки менеджеру + підписи чекбоксів
    payBox.querySelectorAll("label").forEach((l, i) => {
      const o = PAY[i];
      const amount = o.key === "full" ? p.fullPrice : p.perYear[o.key];
      l.querySelector("span").textContent = amount ? o.label(amount) : `${o.key} — немає`;
      l.querySelector("input").disabled = !amount;
    });
    $("priceInfo").textContent =
      `${productLabel(p)} · ${p.pairs} пар · вступний внесок ${fmt(p.entranceFee)} грн · код ${p.code}`;

    const chosen = PAY.filter((o) => {
      const box = payBox.querySelector(`[data-pay="${o.key}"]`);
      const amount = o.key === "full" ? p.fullPrice : p.perYear[o.key];
      return box.checked && amount;
    });

    const L = [];
    const name = f.client || "[ім'я клієнта]";
    if (!f.client) warn.push("вкажи ім'я клієнта");
    L.push(`${pick(GREET)}, ${name}! ${len === "short" ? "Дякую за розмову, надсилаю головне." : pick(THANKS)}`);
    L.push("");

    const who = [f.child, f.age && `${f.age} р.`].filter(Boolean).join(", ");
    const forWhom = who ? ` (${who})` : "";
    L.push(`📚 Програма: ${dir.name ? dir.name + " — " : ""}${p.title}${forWhom}`);
    const sched = [f.days, f.time && `о ${f.time}`].filter(Boolean).join(", ");
    L.push(`🗓 Графік: ${sched ? sched + " · " : ""}${p.format}`);
    if (f.start) L.push(`🚀 Старт: ${f.start}`);
    if (len !== "short") L.push(`⏳ Тривалість: ${years(p.months)} (${p.pairs} пар)`);

    if (len === "long" && dir.about) { L.push(""); L.push(dir.about); }

    if (len !== "short") {
      if (dir.benefits.length) {
        L.push("");
        L.push(`Що отримає ${f.child || "дитина"}:`);
        dir.benefits.slice(0, len === "long" ? 6 : 3).forEach((b) => L.push(`• ${b}`));
      } else {
        warn.push("у data.js не заповнені переваги програми — блок переваг пропущено");
      }
      if (f.interests) {
        L.push("");
        L.push(`Ви згадували, що ${f.child || "дитина"} цікавиться: ${f.interests}. Саме з таких інтересів і починається шлях в IT 🙂`);
      }
      if (f.important) L.push(`📌 Що для Вас важливо: ${f.important}.`);
    }

    L.push("");
    if (len === "short") {
      const monthly = p.perYear["9"];
      L.push(`💰 Вступний внесок — ${fmt(p.entranceFee)} грн` + (monthly ? `, далі від ${fmt(monthly)} грн на місяць.` : "."));
    } else {
      L.push("💰 Вартість:");
      L.push(`• вступний внесок — ${fmt(p.entranceFee)} грн`);
      chosen.forEach((o) => L.push(`• ${o.label(o.key === "full" ? p.fullPrice : p.perYear[o.key])}`));
      if (!chosen.length) warn.push("не вибрано жодного варіанту оплати");
    }

    if (f.promo) { L.push(""); L.push(`🎁 ${f.promo}`); }
    if ($("fewSeats").checked) { L.push(""); L.push("Зверніть увагу: у групі на цей час залишилось небагато місць."); }

    L.push("");
    L.push(nextStep(p, f));
    if ((f.step === "contract" || f.step === "visit") && !D.branch.address) warn.push("у data.js не вказана адреса філії");

    L.push("");
    if (len !== "short") L.push(pick(BYE));
    L.push(`${f.manager || "[твоє ім'я]"}, IT STEP ${D.branch.name}`);
    if (f.phone || D.branch.phone) L.push(f.phone || D.branch.phone);
    if (len === "long" && D.branch.site) L.push(D.branch.site);
    if (!f.manager) warn.push("вкажи своє ім'я");

    const text = L.join("\n").replace(/\n{3,}/g, "\n\n");
    $("msg").value = text;
    $("warn").innerHTML = warn.length ? `<span class="warn">⚠️ ${warn.join(" · ")}</span>` : "";
    updateLinks();
  }

  function updateLinks() {
    const t = encodeURIComponent($("msg").value);
    $("tg").href = `https://t.me/share/url?url=${t}`;
    $("viber").href = `viber://forward?text=${t}`;
    $("wa").href = `https://wa.me/?text=${t}`;
  }

  // ---------- події ----------
  $("form").addEventListener("input", (e) => {
    if (e.target.id === "age" || e.target.id === "days") autoPick();
    build();
  });
  $("form").addEventListener("change", build);
  $("msg").addEventListener("input", updateLinks);

  document.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      len = b.dataset.len;
      build();
    })
  );
  $("variant").addEventListener("click", () => { variant++; build(); });

  $("copy").addEventListener("click", async () => {
    const ta = $("msg");
    try { await navigator.clipboard.writeText(ta.value); }
    catch (e) { ta.select(); document.execCommand("copy"); }
    $("toast").hidden = false;
    setTimeout(() => ($("toast").hidden = true), 1500);
  });

  autoPick();
  build();
})();
