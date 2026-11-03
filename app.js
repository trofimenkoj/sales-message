(function () {
  "use strict";
  const D = window.SALES_DATA;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("uk-UA").replace(/ /g, " ");

  // ---------- оплата ----------
  const PAY_ORDER = ["12", "10", "9", "3", "2", "1", "full"];
  const MONTHLY = ["9", "10", "12"];
  function payLabel(key, amount) {
    const a = `${fmt(amount)} грн`;
    if (key === "full") return `весь курс одразу — ${a}`;
    if (MONTHLY.includes(key)) return `щомісяця — ${a}`;
    if (key === "1") return `раз на рік — ${a}`;
    return `${key} рази на рік — ${a}`;
  }

  function years(months) {
    if (months < 12) return `${months} міс.`;
    const y = Math.round((months / 12) * 10) / 10;
    if (!Number.isInteger(y)) return `${String(y).replace(".", ",")} року`;
    const w = y % 10 === 1 && y % 100 !== 11 ? "рік"
      : [2, 3, 4].includes(y % 10) && ![12, 13, 14].includes(y % 100) ? "роки" : "років";
    return `${y} ${w}`;
  }

  // ---------- список програм (з розділами) ----------
  const sel = $("product");
  const groups = {};
  D.products.forEach((p, i) => {
    if (!groups[p.group]) {
      groups[p.group] = document.createElement("optgroup");
      groups[p.group].label = p.group;
      sel.appendChild(groups[p.group]);
    }
    groups[p.group].appendChild(new Option(p.label, i));
  });
  let productTouched = false;

  // Автовибір МКА за віком і днями, поки менеджер не вибрав програму сам.
  function autoPick() {
    if (productTouched) return;
    const age = parseInt($("age").value, 10);
    const weekend = /сб|суб|нд|нед|вихід/i.test($("days").value);
    let prefix = null;
    if (age >= 9 && age <= 12) prefix = "МКА 9–12";
    else if (age >= 13 && age <= 14) prefix = "МКА 13–14";
    if (!prefix) return;
    const i = D.products.findIndex((p) => p.label.startsWith(prefix) && p.format === (weekend ? "вихідні" : "будні"));
    if (i >= 0) { sel.value = i; onProduct(); }
  }

  // ---------- варіанти оплати та теми під вибрану програму ----------
  const payBox = $("payChecks");
  let topicsKey = null;
  let topicsTouched = false;

  function onProduct() {
    const p = D.products[sel.value];
    const keys = PAY_ORDER.filter((k) => p.pay[k]);
    const monthly = keys.find((k) => MONTHLY.includes(k));
    const defaults = new Set([monthly, "full"].filter((k) => k && p.pay[k]));
    if (defaults.size === 0) keys.slice(0, 2).forEach((k) => defaults.add(k));
    payBox.innerHTML = "";
    keys.forEach((k) => {
      const l = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox"; box.dataset.pay = k; box.checked = defaults.has(k);
      l.append(box, " " + payLabel(k, p.pay[k]));
      payBox.appendChild(l);
    });

    if (p.topics !== topicsKey) {
      topicsKey = p.topics;
      const list = (D.topics && D.topics[p.topics]) || [];
      if (list.length || !topicsTouched) { $("topics").value = list.join("\n"); topicsTouched = false; }
    }
  }

  // Ім'я і телефон менеджера запам'ятовуються в браузері.
  const store = {
    get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  const locSel = $("location");
  (D.branch.locations || []).forEach((l, i) => locSel.add(new Option(l, i)));
  locSel.add(new Option("— не вказувати адресу —", ""));

  ["manager", "phone", "location"].forEach((k) => {
    const v = store.get("sm_" + k);
    if (v !== "" || k !== "location") $(k).value = v;
    $(k).addEventListener(k === "location" ? "change" : "input", () => store.set("sm_" + k, $(k).value));
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

  function nextStep(f, self) {
    const loc = (D.branch.locations || [])[f.location];
    const addr = loc ? ` за адресою: ${loc}` : "";
    switch (f.step) {
      case "trial":
        return `Пропоную почати з пробного заняття — так ${self ? "Ви відчуєте атмосферу і побачите" : "дитина відчує атмосферу, а Ви побачите"}, як проходять уроки. ` +
          (f.when ? `Записати на пробне заняття ${f.when}${addr}? Достатньо відповісти «так» 🙂` : "Коли Вам зручно прийти?");
      case "contract":
        return "Щоб закріпити місце в групі, залишилось оформити договір." +
          (f.when ? ` Чекаю Вас ${f.when}${addr}. Підтвердите?` : " Коли Вам зручно це зробити?");
      case "visit":
        return `Запрошую Вас у філію${addr}. Покажу, де проходить навчання, і відповім на всі запитання.` +
          (f.when ? ` Пропоную ${f.when} — Вам зручно?` : " Коли Вам зручно під'їхати?");
      default:
        return "Якщо з'являться запитання — пишіть, я на зв'язку." +
          (f.when ? ` Наберу Вас ${f.when}, щоб обговорити деталі. Добре?` : "");
    }
  }

  function build() {
    const f = {};
    ["client", "learner", "child", "age", "interests", "important", "days", "time", "start", "topics", "step", "when", "location", "promo", "manager", "phone"]
      .forEach((k) => (f[k] = $(k).value.trim()));
    const self = f.learner === "self";
    document.querySelectorAll(".childOnly").forEach((el) => (el.hidden = self));
    const p = D.products[sel.value];
    const warn = [];

    const chosen = [...payBox.querySelectorAll("input:checked")].map((b) => b.dataset.pay);
    const topics = f.topics.split("\n").map((t) => t.replace(/^[•\-–*\s]+/, "").trim()).filter(Boolean);
    const student = self ? "" : f.child || "дитина";

    const L = [];
    if (!f.client) warn.push("вкажи ім'я клієнта");
    L.push(`${pick(GREET)}, ${f.client || "[ім'я клієнта]"}! ${len === "short" ? "Дякую за розмову, надсилаю головне." : pick(THANKS)}`);
    L.push("");

    const who = self ? "" : [f.child, f.age && `${f.age} р.`].filter(Boolean).join(", ");
    L.push(`📚 Програма: ${p.title}${who ? ` — ${who}` : ""}`);
    const sched = [f.days, f.time && `о ${f.time}`].filter(Boolean).join(", ");
    if (sched || p.format) L.push(`🗓 Графік: ${[sched, p.format].filter(Boolean).join(" · ")}`);
    else warn.push("не вказаний графік");
    if (f.start) L.push(`🚀 Старт: ${f.start}`);
    if (len !== "short") L.push(`⏳ Тривалість: ${years(p.months)}`);

    if (topics.length) {
      L.push("");
      L.push(self ? "📖 Що Ви вивчатимете:" : `📖 Що вивчатиме ${student}:`);
      topics.slice(0, len === "short" ? 3 : len === "std" ? 5 : 10).forEach((t) => L.push(`• ${t}`));
    } else {
      warn.push("не заповнено «Що вивчатимуть»");
    }

    if (len !== "short") {
      if (f.interests) {
        L.push("");
        L.push(self
          ? `Ви згадували, що Вас цікавить: ${f.interests}. Саме з таких інтересів і починається шлях в IT 🙂`
          : `Ви згадували, що ${student} цікавиться: ${f.interests}. Саме з таких інтересів і починається шлях в IT 🙂`);
      }
      if (f.important) L.push(`📌 Що для Вас важливо: ${f.important}.`);
    }

    L.push("");
    if (!chosen.length) warn.push("не вибрано жодного варіанту оплати");
    if (len === "short" || chosen.length === 1) {
      const k = chosen.find((c) => MONTHLY.includes(c)) || chosen[0];
      if (k) L.push(`💰 Вартість: ${MONTHLY.includes(k) ? `від ${fmt(p.pay[k])} грн на місяць` : payLabel(k, p.pay[k])}.`);
    } else {
      L.push("💰 Вартість:");
      PAY_ORDER.filter((k) => chosen.includes(k)).forEach((k) => L.push(`• ${payLabel(k, p.pay[k])}`));
    }

    if (f.promo) { L.push(""); L.push(`🎁 ${f.promo}`); }
    if ($("fewSeats").checked) { L.push(""); L.push("Зверніть увагу: у групі на цей час залишилось небагато місць."); }

    L.push("");
    L.push(nextStep(f, self));
    if ((f.step === "contract" || f.step === "visit") && f.location === "") warn.push("не вибрана локація");

    L.push("");
    if (len !== "short") L.push(pick(BYE));
    L.push(`${f.manager || "[твоє ім'я]"}, IT STEP ${D.branch.name}`);
    if (f.phone || D.branch.phone) L.push(f.phone || D.branch.phone);
    if (!f.manager) warn.push("вкажи своє ім'я");

    $("msg").value = L.join("\n").replace(/\n{3,}/g, "\n\n");
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
  sel.addEventListener("change", () => { productTouched = true; onProduct(); });
  $("topics").addEventListener("input", () => { topicsTouched = true; });
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

  onProduct();
  build();
})();
