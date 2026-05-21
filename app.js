const STORAGE_KEY = "sistemaClienteMaria";

const defaultData = {
  custos: [],
  ingredientes: [],
  fichas: [],
  vendas: [],
};

const tabs = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "custos", label: "💸 Custos e Taxas" },
  { id: "ingredientes", label: "🥛 Ingredientes" },
  { id: "fichas", label: "🧾 Ficha Técnica" },
  { id: "vendas", label: "🛍️ Venda" },
];

// SISTEMA COMEÇA LIMPO
const state = structuredClone(defaultData);

function loadData() {
  try {
    return {
      ...defaultData,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const BRL = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const uid = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

const isSamePrice = (a, b) =>
  Math.abs(Number(a) - Number(b)) < 0.01;

renderTabs();
showTab("dashboard");
renderAll();

function renderTabs() {
  const container = document.getElementById("tabs");

  container.innerHTML = tabs
    .map(
      (t) =>
        `<button class="tab-btn" data-tab="${t.id}">${t.label}</button>`
    )
    .join("");

  container.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (b) showTab(b.dataset.tab);
  });
}

function showTab(id) {
  tabs.forEach((t) => {
    document
      .querySelector(`#${t.id}-panel`)
      .classList.toggle("hidden", t.id !== id);

    document
      .querySelector(`[data-tab="${t.id}"]`)
      ?.classList.toggle("active", t.id === id);
  });
}

function renderAll() {
  renderDashboard();
  renderCustos();
  renderIngredientes();
  renderFichas();
  renderVendas();

  saveData();
}

function renderDashboard() {
  const p = document.getElementById("dashboard-panel");

  const fixos = state.custos.reduce(
    (a, c) => a + Number(c.valor),
    0
  );

  const custoFichas = state.fichas.reduce(
    (a, f) => a + Number(f.custoTotal || 0),
    0
  );

  const receita = state.vendas.reduce(
    (a, v) => a + Number(v.precoPraticado || 0),
    0
  );

  const lucroTotal = state.vendas.reduce(
    (a, v) => a + Number(v.lucro || 0),
    0
  );

  const margemMedia = state.vendas.length
    ? state.vendas.reduce(
        (a, v) => a + Number(v.margemPct || 0),
        0
      ) / state.vendas.length
    : 0;

  p.innerHTML = `
    <h2>Dashboard Profissional</h2>

    <div class="grid">
      ${card("Receita total", BRL(receita), "Soma dos preços praticados")}
      ${card("Custos fixos", BRL(fixos), "Soma dos custos e taxas")}
      ${card("Lucro total", BRL(lucroTotal), "Resultado das vendas")}
      ${card("Margem média", pct(margemMedia), "Média da margem por produto")}
    </div>

    <h3>Gráficos e percentuais</h3>

    <div class="chart-box">
      ${progress(
        "Custos fixos sobre receita",
        receita > 0 ? (fixos / receita) * 100 : 0,
        "warn"
      )}

      ${progress(
        "Lucro sobre receita",
        receita > 0 ? (lucroTotal / receita) * 100 : 0,
        "ok"
      )}

      ${progress(
        "Margem média dos produtos",
        margemMedia,
        "high"
      )}
    </div>

    <h3>Resumo operacional</h3>

    <ul>
      <li>Custos cadastrados: <b>${state.custos.length}</b></li>
      <li>Ingredientes cadastrados: <b>${state.ingredientes.length}</b></li>
      <li>Fichas técnicas cadastradas: <b>${state.fichas.length}</b></li>
      <li>Produtos em venda cadastrados: <b>${state.vendas.length}</b></li>
      <li>Custo total das fichas: <b>${BRL(custoFichas)}</b></li>
    </ul>
  `;
}

function card(t, v, s) {
  return `
    <article class="card">
      <h3>${t}</h3>
      <p class="value">${v}</p>
      <small>${s}</small>
    </article>
  `;
}

function calculateSaleStatus(
  precoPraticado,
  precoSugerido,
  lucro,
  margem
) {
  if (isSamePrice(precoPraticado, precoSugerido))
    return "margem correta";

  if (Number(lucro) < 0) return "ajustar";

  return Number(margem) < 20
    ? "margem curta"
    : "margem alta";
}

function progress(label, value, tone) {
  const val = Math.max(
    0,
    Math.min(100, Number(value || 0))
  );

  return `
    <div class="metric">
      <div class="metric-head">
        <span>${label}</span>
        <b>${pct(val)}</b>
      </div>

      <div class="bar">
        <span class="fill ${tone}" style="width:${val}%"></span>
      </div>
    </div>
  `;
}

function renderCustos() {
  const p = document.getElementById("custos-panel");

  p.innerHTML = `
    <h2>Custos e Taxas</h2>

    <button class="toggle-btn" id="btn-cadastro-custo">
      + Cadastrar Custo
    </button>

    <form id="f-custos">
      <input required name="descricao" placeholder="Descrição" />

      <input
        required
        name="categoria"
        placeholder="Categoria"
      />

      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="valor"
        placeholder="Valor"
      />

      <button type="submit">
        Salvar cadastro
      </button>
    </form>

    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>
        ${
          state.custos
            .map(
              (c) => `
            <tr>
              <td>${c.descricao}</td>
              <td>${c.categoria}</td>
              <td>${BRL(c.valor)}</td>

              <td>
                <button
                  class="secondary"
                  data-del-custo="${c.id}"
                >
                  Excluir
                </button>
              </td>
            </tr>
          `
            )
            .join("") ||
          `
          <tr>
            <td colspan="4">
              Sem cadastros ainda.
            </td>
          </tr>
        `
        }
      </tbody>
    </table>
  `;

  p.querySelector("#btn-cadastro-custo").onclick =
    () =>
      p
        .querySelector("#f-custos")
        .scrollIntoView({ behavior: "smooth" });

  p.querySelector("#f-custos").onsubmit = (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);

    state.custos.push({
      id: uid(),
      descricao: fd.get("descricao"),
      categoria: fd.get("categoria"),
      valor: Number(fd.get("valor")),
    });

    renderAll();

    e.target.reset();
  };

  p.querySelectorAll("[data-del-custo]").forEach(
    (b) =>
      (b.onclick = () => {
        state.custos = state.custos.filter(
          (c) => c.id !== b.dataset.delCusto
        );

        renderAll();
      })
  );
}

/*
CONTINUA O RESTANTE DO CÓDIGO EXATAMENTE IGUAL:
- renderIngredientes()
- renderFichas()
- renderVendas()
- statusBadge()

A única mudança necessária era:
1. remover os dados demo
2. iniciar com state limpo
3. trocar STORAGE_KEY
*/
