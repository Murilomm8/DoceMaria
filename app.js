const STORAGE_KEY = "SistemaDoceMaria";

const defaultData = {
  custos: [],
  ingredientes: [],
  fichas: [],
  vendas: [],
};


/* =========================================================
   MENU
========================================================= */

const tabs = [
  {
    id: "dashboard",
    label: "📊 Dashboard",
  },

  {
    id: "custos",
    label: "💸 Custos e Taxas",
  },

  {
    id: "ingredientes",
    label: "🥛 Ingredientes",
  },

  {
    id: "fichas",
    label: "🧾 Ficha Técnica",
  },

  {
    id: "vendas",
    label: "🛍️ Venda",
  },
];


/* =========================================================
   ESTADO
========================================================= */

const state = loadData();


/* =========================================================
   LOCAL STORAGE
========================================================= */

function cloneDefaultData() {
  return {
    custos: [],
    ingredientes: [],
    fichas: [],
    vendas: [],
  };
}


function loadData() {
  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        ) || "{}"
      );


    return {

      custos:
        Array.isArray(
          saved.custos
        )
          ? saved.custos
          : [],

      ingredientes:
        Array.isArray(
          saved.ingredientes
        )
          ? saved.ingredientes
          : [],

      fichas:
        Array.isArray(
          saved.fichas
        )
          ? saved.fichas
          : [],

      vendas:
        Array.isArray(
          saved.vendas
        )
          ? saved.vendas
          : [],

    };

  } catch (error) {

    console.error(
      "Erro ao carregar dados:",
      error
    );

    return cloneDefaultData();
  }
}


function saveData() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}


/* =========================================================
   UTILITÁRIOS
========================================================= */

const BRL = (number) =>
  Number(
    number || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );


const uid = () =>
  `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;


const pct = (number) =>
  `${Number(
    number || 0
  ).toFixed(1)}%`;


const isSamePrice = (
  a,
  b
) =>
  Math.abs(
    Number(a) -
    Number(b)
  ) < 0.01;


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   BUSCAS
========================================================= */

function getIngredient(id) {

  return state.ingredientes.find(
    (ingredient) =>
      ingredient.id === id
  );

}


function getFicha(id) {

  return state.fichas.find(
    (ficha) =>
      ficha.id === id
  );

}

/* =========================================================
   FILTROS E ORDENAÇÃO
========================================================= */

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function filterAndSort(items, searchTerm, getLabel, sortOrder = "az") {
  const search = normalizeText(searchTerm);

  return items
    .filter((item) =>
      normalizeText(getLabel(item)).includes(search)
    )
    .slice()
    .sort((a, b) => {
      const comparison = String(getLabel(a) ?? "").localeCompare(
        String(getLabel(b) ?? ""),
        "pt-BR",
        {
          sensitivity: "base",
          numeric: true,
        }
      );

      return sortOrder === "za"
        ? -comparison
        : comparison;
    });
}
/* =========================================================
   RECÁLCULOS
========================================================= */

function recalculateFicha(
  ficha
) {

  if (!ficha) return;


  ficha.itens =
    Array.isArray(
      ficha.itens
    )
      ? ficha.itens
      : [];


  ficha.itens =
    ficha.itens
      .map(
        (item) => {

          const ingredient =
            getIngredient(
              item.ingredienteId
            );


          if (!ingredient) {
            return null;
          }


          const quantidade =
            Number(
              item.qtd || 0
            );


          return {

            ...item,

            produto:
              ingredient.produto,

            unidade:
              ingredient.unidade,

            qtd:
              quantidade,

            custo:
              quantidade *
              Number(
                ingredient.valorUnitario ||
                  0
              ),

          };

        }
      )
      .filter(Boolean);


  ficha.custoTotal =
    ficha.itens.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.custo || 0
        ),
      0
    );

}


function recalculateAllFichas() {

  state.fichas.forEach(
    (ficha) => {
      recalculateFicha(
        ficha
      );
    }
  );

}


function syncSalesForFicha(
  fichaId
) {

  const ficha =
    getFicha(
      fichaId
    );


  if (!ficha) return;


  state.vendas.forEach(
    (sale) => {

      if (
        sale.fichaId !==
        fichaId
      ) {
        return;
      }


      const lucroDesejadoPct =
        Number(
          sale.lucroDesejadoPct ||
            0
        );


      const precoPraticado =
        Number(
          sale.precoPraticado ||
            0
        );


      const precoSugerido =
        ficha.custoTotal *
        (
          1 +
          lucroDesejadoPct /
            100
        );


      const lucro =
        precoPraticado -
        ficha.custoTotal;


      const margemPct =
        ficha.custoTotal >
        0
          ? (
              lucro /
              ficha.custoTotal
            ) * 100
          : 0;


      sale.produto =
        ficha.nome;

      sale.custo =
        ficha.custoTotal;

      sale.precoSugerido =
        precoSugerido;

      sale.lucro =
        lucro;

      sale.margemPct =
        margemPct;

      sale.status =
        calculateSaleStatus(
          precoPraticado,
          precoSugerido,
          lucro,
          margemPct
        );

    }
  );

}


function syncAllSales() {

  recalculateAllFichas();

  state.fichas.forEach(
    (ficha) => {

      syncSalesForFicha(
        ficha.id
      );

    }
  );

}


function calculateSaleValues(
  ficha,
  lucroDesejadoPct,
  precoPraticado
) {

  const custo =
    Number(
      ficha?.custoTotal ||
        0
    );


  const lucroDesejado =
    Number(
      lucroDesejadoPct ||
        0
    );


  const praticado =
    Number(
      precoPraticado ||
        0
    );


  const precoSugerido =
    custo *
    (
      1 +
      lucroDesejado /
        100
    );


  const lucro =
    praticado -
    custo;


  const margemPct =
    custo > 0
      ? (
          lucro /
          custo
        ) * 100
      : 0;


  return {

    custo,

    lucroDesejadoPct:
      lucroDesejado,

    precoSugerido,

    precoPraticado:
      praticado,

    lucro,

    margemPct,

    status:
      calculateSaleStatus(
        praticado,
        precoSugerido,
        lucro,
        margemPct
      ),

  };

}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function renderTabs() {

  const container =
    document.getElementById(
      "tabs"
    );


  if (!container) return;


  container.innerHTML =
    tabs
      .map(
        (tab) =>
          `
            <button
              class="tab-btn"
              data-tab="${tab.id}"
            >
              ${tab.label}
            </button>
          `
      )
      .join("");


  container.onclick =
    (event) => {

      const button =
        event.target.closest(
          "button[data-tab]"
        );


      if (button) {

        showTab(
          button.dataset.tab
        );

      }

    };

}


function showTab(id) {

  tabs.forEach(
    (tab) => {

      const panel =
        document.querySelector(
          `#${tab.id}-panel`
        );


      const button =
        document.querySelector(
          `[data-tab="${tab.id}"]`
        );


      panel?.classList.toggle(
        "hidden",
        tab.id !== id
      );


      button?.classList.toggle(
        "active",
        tab.id === id
      );

    }
  );

}


/* =========================================================
   RENDER GERAL
========================================================= */

function renderAll() {

  syncAllSales();

  renderDashboard();

  renderCustos();

  renderIngredientes();

  renderFichas();

  renderVendas();

  saveData();

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const panel =
    document.getElementById(
      "dashboard-panel"
    );


  if (!panel) return;


  const custosTotal =
    state.custos.reduce(
      (
        total,
        cost
      ) =>
        total +
        Number(
          cost.valor || 0
        ),
      0
    );


  const custoFichas =
    state.fichas.reduce(
      (
        total,
        ficha
      ) =>
        total +
        Number(
          ficha.custoTotal ||
            0
        ),
      0
    );


  const receita =
    state.vendas.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.precoPraticado ||
            0
        ),
      0
    );


  const lucroTotal =
    state.vendas.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.lucro ||
            0
        ),
      0
    );


  const margemMedia =
    state.vendas.length
      ? state.vendas.reduce(
          (
            total,
            sale
          ) =>
            total +
            Number(
              sale.margemPct ||
                0
            ),
          0
        ) /
        state.vendas.length
      : 0;


  panel.innerHTML = `

    <h2>
      Dashboard Profissional
    </h2>


    <div class="grid">

      ${card(
        "Receita total",
        BRL(receita),
        "Soma dos preços praticados"
      )}

      ${card(
        "Custos e taxas",
        BRL(custosTotal),
        "Soma dos custos cadastrados"
      )}

      ${card(
        "Lucro total",
        BRL(lucroTotal),
        "Resultado das vendas"
      )}

      ${card(
        "Margem média",
        pct(margemMedia),
        "Média da margem por produto"
      )}

    </div>


    <h3>
      Gráficos e percentuais
    </h3>


    <div class="chart-box">

      ${progress(
        "Custos sobre receita",
        receita > 0
          ? (
              custosTotal /
              receita
            ) * 100
          : 0,
        "warn"
      )}


      ${progress(
        "Lucro sobre receita",
        receita > 0
          ? (
              lucroTotal /
              receita
            ) * 100
          : 0,
        "ok"
      )}


      ${progress(
        "Margem média dos produtos",
        margemMedia,
        "high"
      )}

    </div>


    <h3>
      Resumo operacional
    </h3>


    <ul>

      <li>
        Custos cadastrados:
        <b>
          ${state.custos.length}
        </b>
      </li>

      <li>
        Ingredientes cadastrados:
        <b>
          ${state.ingredientes.length}
        </b>
      </li>

      <li>
        Fichas técnicas cadastradas:
        <b>
          ${state.fichas.length}
        </b>
      </li>

      <li>
        Produtos em venda cadastrados:
        <b>
          ${state.vendas.length}
        </b>
      </li>

      <li>
        Custo total das fichas:
        <b>
          ${BRL(custoFichas)}
        </b>
      </li>

    </ul>

  `;

}


function card(
  title,
  value,
  subtitle
) {

  return `

    <article class="card">

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p class="value">
        ${value}
      </p>

      <small>
        ${escapeHTML(subtitle)}
      </small>

    </article>

  `;

}


/* =========================================================
   STATUS
========================================================= */

function calculateSaleStatus(
  precoPraticado,
  precoSugerido,
  lucro,
  margem
) {

  if (
    isSamePrice(
      precoPraticado,
      precoSugerido
    )
  ) {

    return "margem correta";

  }


  if (
    Number(lucro) < 0
  ) {

    return "ajustar";

  }


  return Number(margem) < 20
    ? "margem curta"
    : "margem alta";

}


function statusBadge(
  status
) {

  const cls =
    status ===
    "margem alta"

      ? "high"

      : status ===
        "ajustar"

      ? "warn"

      : "ok";


  return `

    <span
      class="badge ${cls}"
    >
      ${escapeHTML(status)}
    </span>

  `;

}


function progress(
  label,
  value,
  tone
) {

  const val =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          value || 0
        )
      )
    );


  return `

    <div class="metric">

      <div class="metric-head">

        <span>
          ${escapeHTML(label)}
        </span>

        <b>
          ${pct(val)}
        </b>

      </div>


      <div class="bar">

        <span
          class="fill ${tone}"
          style="width:${val}%"
        ></span>

      </div>

    </div>

  `;

}


/* =========================================================
   CUSTOS
========================================================= */

function renderCustos() {
  const panel = document.getElementById("custos-panel");

  if (!panel) return;

  const custosFiltrados = filterAndSort(
    state.custos,
    renderCustos.searchTerm,
    (cost) => cost.descricao,
    renderCustos.sortOrder
  );

  panel.innerHTML = `
    <h2>Custos e Taxas</h2>

    <button
      class="toggle-btn"
      id="btn-cadastro-custo"
    >
      + Cadastrar Custo
    </button>

    <form id="f-custos">

      <input
        required
        name="descricao"
        placeholder="Descrição (Ex.: Aluguel)"
      />

      <input
        required
        name="categoria"
        placeholder="Categoria (fixo/taxa/imposto)"
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

    <div class="filters-row">

      <div class="search-box">

        <span class="search-icon">🔎</span>

        <input
          id="filtro-custo-descricao"
          type="search"
          placeholder="Buscar custo..."
          value="${escapeHTML(renderCustos.searchTerm)}"
        />

      </div>

      <select
        id="ordenacao-custo"
        class="sort-select"
      >

        <option
          value="az"
          ${renderCustos.sortOrder === "az" ? "selected" : ""}
        >
          A → Z
        </option>

        <option
          value="za"
          ${renderCustos.sortOrder === "za" ? "selected" : ""}
        >
          Z → A
        </option>

      </select>

    </div>

    <div class="filter-info">
      ${custosFiltrados.length} custo(s) encontrado(s)
    </div>

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
          custosFiltrados.length
            ? custosFiltrados
                .map(
                  (cost) => `
                    <tr>

                      <td>
                        ${escapeHTML(cost.descricao)}
                      </td>

                      <td>
                        ${escapeHTML(cost.categoria)}
                      </td>

                      <td>
                        ${BRL(cost.valor)}
                      </td>

                      <td>

                        <div class="actions-row">

                          <button
                            class="secondary"
                            data-edit-custo="${cost.id}"
                          >
                            ✏️ Editar
                          </button>

                          <button
                            class="secondary"
                            data-del-custo="${cost.id}"
                          >
                            🗑️ Excluir
                          </button>

                        </div>

                      </td>

                    </tr>
                  `
                )
                .join("")
            : `
                <tr>

                  <td colspan="4">
                    ${
                      renderCustos.searchTerm
                        ? "Nenhum custo encontrado para essa busca."
                        : "Sem cadastros ainda."
                    }
                  </td>

                </tr>
              `
        }

      </tbody>

    </table>
  `;

  /* =========================================================
     BOTÃO CADASTRO
  ========================================================= */

  panel
    .querySelector("#btn-cadastro-custo")
    .onclick = () => {

      panel
        .querySelector("#f-custos")
        .scrollIntoView({
          behavior: "smooth",
        });

    };

  /* =========================================================
     CADASTRO
  ========================================================= */

  panel
    .querySelector("#f-custos")
    .onsubmit = (event) => {

      event.preventDefault();

      const formData =
        new FormData(event.target);

      state.custos.push({

        id: uid(),

        descricao:
          String(
            formData.get("descricao") || ""
          ).trim(),

        categoria:
          String(
            formData.get("categoria") || ""
          ).trim(),

        valor:
          Number(
            formData.get("valor")
          ),

      });

      event.target.reset();

      renderAll();

    };

  /* =========================================================
     BUSCA
  ========================================================= */

  const filtro =
    panel.querySelector(
      "#filtro-custo-descricao"
    );

  filtro?.addEventListener(
    "input",
    (event) => {

      const cursorPosition =
        event.target.selectionStart;

      renderCustos.searchTerm =
        event.target.value;

      renderCustos();

      const novoCampo =
        document.getElementById(
          "filtro-custo-descricao"
        );

      if (novoCampo) {

        novoCampo.focus();

        const position =
          Math.min(
            cursorPosition ??
              novoCampo.value.length,
            novoCampo.value.length
          );

        novoCampo.setSelectionRange(
          position,
          position
        );

      }

    }
  );

  /* =========================================================
     ORDENAÇÃO
  ========================================================= */

  const ordenacao =
    panel.querySelector(
      "#ordenacao-custo"
    );

  ordenacao?.addEventListener(
    "change",
    (event) => {

      renderCustos.sortOrder =
        event.target.value;

      renderCustos();

    }
  );

  /* =========================================================
     EDITAR
  ========================================================= */

  panel
    .querySelectorAll(
      "[data-edit-custo]"
    )
    .forEach((button) => {

      button.onclick = () => {

        editCusto(
          button.dataset.editCusto
        );

      };

    });

  /* =========================================================
     EXCLUIR
  ========================================================= */

  panel
    .querySelectorAll(
      "[data-del-custo]"
    )
    .forEach((button) => {

      button.onclick = () => {

        state.custos =
          state.custos.filter(
            (cost) =>
              cost.id !==
              button.dataset.delCusto
          );

        renderAll();

      };

    });

}


/* =========================================================
   ESTADO DOS FILTROS DE CUSTOS
========================================================= */

renderCustos.searchTerm = "";
renderCustos.sortOrder = "az";


/* =========================================================
   INGREDIENTES
========================================================= */

function renderIngredientes() {
  const panel = document.getElementById("ingredientes-panel");

  if (!panel) return;

  panel.innerHTML = `
    <h2>
      Ingredientes
    </h2>

    <button
      class="toggle-btn"
      id="btn-cadastro-ing"
    >
      + Cadastrar Ingrediente
    </button>

    <form
      id="f-ing"
    >

      <input
        required
        name="produto"
        placeholder="Produto"
      />

      <input
        required
        name="unidade"
        placeholder="Unidade (ml, g, kg, un)"
      />

      <input
        required
        type="number"
        min="0.01"
        step="0.01"
        name="quantidade"
        placeholder="Quantidade de compra"
      />

      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="valor"
        placeholder="Valor da compra"
      />

      <button type="submit">
        Salvar cadastro
      </button>

    </form>

    <!-- FILTROS -->
    <div class="filters-row">

      <div class="search-box">

        <span class="search-icon">
          🔎
        </span>

        <input
          type="search"
          id="filtro-ingrediente-produto"
          placeholder="Pesquisar ingrediente..."
          autocomplete="off"
        />

      </div>

      <select
        id="ordenacao-ingrediente"
        class="sort-select"
      >
        <option value="az">
          A → Z
        </option>

        <option value="za">
          Z → A
        </option>
      </select>

    </div>

    <div
      class="filter-info"
      id="info-filtro-ingrediente"
    ></div>

    <table>

      <thead>

        <tr>

          <th>
            Produto
          </th>

          <th>
            Unidade
          </th>

          <th>
            Qtd
          </th>

          <th>
            Valor compra
          </th>

          <th>
            Valor unitário
          </th>

          <th>
            Ações
          </th>

        </tr>

      </thead>

      <tbody id="tbody-ingredientes">

      </tbody>

    </table>
  `;

  /* =========================================================
     ESTADO DOS FILTROS
  ========================================================= */

  if (typeof renderIngredientes.searchTerm !== "string") {
    renderIngredientes.searchTerm = "";
  }

  if (
    renderIngredientes.sortOrder !== "az" &&
    renderIngredientes.sortOrder !== "za"
  ) {
    renderIngredientes.sortOrder = "az";
  }

  /* =========================================================
     RENDERIZAÇÃO DA TABELA
  ========================================================= */

  const renderTabelaIngredientes = () => {
    const tbody = panel.querySelector(
      "#tbody-ingredientes"
    );

    const info = panel.querySelector(
      "#info-filtro-ingrediente"
    );

    const searchInput = panel.querySelector(
      "#filtro-ingrediente-produto"
    );

    const sortSelect = panel.querySelector(
      "#ordenacao-ingrediente"
    );

    const ingredientesFiltrados = filterAndSort(
      state.ingredientes,
      renderIngredientes.searchTerm,
      (ingredient) => ingredient.produto,
      renderIngredientes.sortOrder
    );

    if (searchInput) {
      searchInput.value =
        renderIngredientes.searchTerm;
    }

    if (sortSelect) {
      sortSelect.value =
        renderIngredientes.sortOrder;
    }

    if (info) {
      const total = state.ingredientes.length;
      const exibidos = ingredientesFiltrados.length;

      if (renderIngredientes.searchTerm) {
        info.innerHTML = `
          Exibindo
          <strong>${exibidos}</strong>
          de
          <strong>${total}</strong>
          ingredientes.
        `;
      } else {
        info.innerHTML = `
          <strong>${total}</strong>
          ingrediente(s) cadastrado(s).
        `;
      }
    }

    tbody.innerHTML =
      ingredientesFiltrados.length
        ? ingredientesFiltrados
            .map(
              (ingredient) => `
                <tr>

                  <td>
                    ${escapeHTML(
                      ingredient.produto
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      ingredient.unidade
                    )}
                  </td>

                  <td>
                    ${Number(
                      ingredient.quantidade || 0
                    )}
                  </td>

                  <td>
                    ${BRL(
                      ingredient.valorCompra
                    )}
                  </td>

                  <td>
                    ${BRL(
                      ingredient.valorUnitario
                    )}
                  </td>

                  <td>

                    <div class="actions-row">

                      <button
                        class="secondary"
                        data-edit-ing="${ingredient.id}"
                      >
                        ✏️ Editar
                      </button>

                      <button
                        class="secondary"
                        data-del-ing="${ingredient.id}"
                      >
                        🗑️ Excluir
                      </button>

                    </div>

                  </td>

                </tr>
              `
            )
            .join("")
        : `
            <tr>

              <td colspan="6">
                ${
                  renderIngredientes.searchTerm
                    ? "Nenhum ingrediente encontrado."
                    : "Sem cadastros ainda."
                }
              </td>

            </tr>
          `;

    /* =========================================================
       BOTÕES DE EDITAR
    ========================================================= */

    panel
      .querySelectorAll("[data-edit-ing]")
      .forEach((button) => {

        button.onclick = () => {

          editIngrediente(
            button.dataset.editIng
          );

        };

      });

    /* =========================================================
       BOTÕES DE EXCLUIR
    ========================================================= */

    panel
      .querySelectorAll("[data-del-ing]")
      .forEach((button) => {

        button.onclick = () => {

          deleteIngrediente(
            button.dataset.delIng
          );

        };

      });
  };

  /* =========================================================
     BOTÃO CADASTRAR
  ========================================================= */

  panel.querySelector(
    "#btn-cadastro-ing"
  ).onclick = () => {

    panel
      .querySelector("#f-ing")
      .scrollIntoView({
        behavior: "smooth",
      });

  };

  /* =========================================================
     CADASTRO DE INGREDIENTE
  ========================================================= */

  panel.querySelector(
    "#f-ing"
  ).onsubmit = (event) => {

    event.preventDefault();

    const formData = new FormData(
      event.target
    );

    const quantidade = Number(
      formData.get("quantidade")
    );

    const valorCompra = Number(
      formData.get("valor")
    );

    if (quantidade <= 0) {

      alert(
        "A quantidade de compra deve ser maior que zero."
      );

      return;

    }

    state.ingredientes.push({

      id: uid(),

      produto:
        String(
          formData.get("produto") || ""
        ).trim(),

      unidade:
        String(
          formData.get("unidade") || ""
        ).trim(),

      quantidade,

      valorCompra,

      valorUnitario:
        valorCompra / quantidade,

    });

    event.target.reset();

    renderAll();

  };

  /* =========================================================
     PESQUISA
  ========================================================= */

  const searchInput = panel.querySelector(
    "#filtro-ingrediente-produto"
  );

  searchInput.value =
    renderIngredientes.searchTerm;

  searchInput.addEventListener(
    "input",
    (event) => {

      renderIngredientes.searchTerm =
        event.target.value;

      renderTabelaIngredientes();

      searchInput.focus();

      const length =
        searchInput.value.length;

      searchInput.setSelectionRange(
        length,
        length
      );

    }
  );

  /* =========================================================
     ORDENAÇÃO
  ========================================================= */

  const sortSelect = panel.querySelector(
    "#ordenacao-ingrediente"
  );

  sortSelect.value =
    renderIngredientes.sortOrder;

  sortSelect.addEventListener(
    "change",
    (event) => {

      renderIngredientes.sortOrder =
        event.target.value;

      renderTabelaIngredientes();

    }
  );

  /* =========================================================
     PRIMEIRA RENDERIZAÇÃO
  ========================================================= */

  renderTabelaIngredientes();
}

/* =========================================================
   FICHAS
========================================================= */
function renderFichas() {
  const panel = document.getElementById("fichas-panel");

  const fichasFiltradas = filterAndSort(
    state.fichas,
    renderFichas.searchTerm,
    (ficha) => ficha.nome,
    renderFichas.sortOrder
  );

  panel.innerHTML = `
    <h2>Ficha Técnica</h2>

    <div class="actions-row">
      <button id="btn-nova-ficha">+ Nova ficha</button>
    </div>

    <form id="f-ficha" class="hidden">
      <input
        id="f-ficha-produto"
        placeholder="Nome do produto final"
        required
      />

      <button type="submit">
        Salvar ficha
      </button>

      <button
        type="button"
        class="secondary"
        id="cancelar-ficha"
      >
        Cancelar
      </button>
    </form>

    <div class="filters-row">
      <div class="search-box">
        <span class="search-icon">🔎</span>

        <input
          id="filtro-ficha-produto"
          type="search"
          placeholder="Buscar produto..."
          value="${escapeHTML(renderFichas.searchTerm)}"
        />
      </div>

      <select id="ordenacao-ficha" class="sort-select">
        <option value="az" ${
          renderFichas.sortOrder === "az" ? "selected" : ""
        }>
          A → Z
        </option>

        <option value="za" ${
          renderFichas.sortOrder === "za" ? "selected" : ""
        }>
          Z → A
        </option>
      </select>
    </div>

    <div id="info-filtro-ficha" class="filter-info">
      ${fichasFiltradas.length} ficha(s) encontrada(s)
    </div>

    <form id="f-ficha-item">
      <select id="fichaId" required>
        <option value="">Selecione a ficha</option>

        ${state.fichas
          .map(
            (ficha) => `
              <option value="${ficha.id}">
                ${escapeHTML(ficha.nome)}
              </option>
            `
          )
          .join("")}
      </select>

      <select id="ingredienteId" required>
        <option value="">Selecione o ingrediente</option>

        ${state.ingredientes
          .map(
            (ingredient) => `
              <option value="${ingredient.id}">
                ${escapeHTML(ingredient.produto)}
              </option>
            `
          )
          .join("")}
      </select>

      <input
        id="quantidadeUso"
        type="number"
        min="0"
        step="0.001"
        placeholder="Quantidade usada"
        required
      />

      <button type="submit">
        Adicionar ingrediente
      </button>
    </form>

    <table>
      <thead>
        <tr>
          <th>Produto final</th>
          <th>Ingredientes</th>
          <th>Custo total</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>
        ${
          fichasFiltradas.length
            ? fichasFiltradas
                .map((ficha) => {
const ingredientesTexto =
  ficha.itens && ficha.itens.length
    ? ficha.itens
        .map((item) => {
          return `${escapeHTML(
            item.produto || ""
          )} (${Number(item.qtd || 0)} ${escapeHTML(
            item.unidade || ""
          )})`;
        })
        .filter(Boolean)
        .join(", ")
    : "Nenhum ingrediente";

                  return `
                    <tr>
                      <td>
                        <strong>
                          ${escapeHTML(ficha.nome)}
                        </strong>
                      </td>

                      <td>
                        ${ingredientesTexto}
                      </td>

                      <td>
                        ${BRL(ficha.custoTotal)}
                      </td>

                      <td>
                        <div class="actions-row">
                          <button
                            type="button"
                            data-edit-ficha="${ficha.id}"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            class="secondary"
                            data-del-ficha="${ficha.id}"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                })
                .join("")
            : `
              <tr>
                <td colspan="4">
                  Nenhuma ficha encontrada.
                </td>
              </tr>
            `
        }
      </tbody>
    </table>
  `;

  /* =========================================================
     NOVA FICHA
  ========================================================= */

  const btnNovaFicha = document.getElementById("btn-nova-ficha");
  const formFicha = document.getElementById("f-ficha");
  const cancelarFicha = document.getElementById("cancelar-ficha");

  btnNovaFicha?.addEventListener("click", () => {
    formFicha.classList.remove("hidden");
    document.getElementById("f-ficha-produto")?.focus();
  });

  cancelarFicha?.addEventListener("click", () => {
    formFicha.reset();
    formFicha.classList.add("hidden");
  });

  formFicha?.addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = document
      .getElementById("f-ficha-produto")
      .value.trim();

    if (!nome) {
      return;
    }

    state.fichas.push({
      id: uid(),
      nome,
      itens: [],
      custoTotal: 0,
    });

    saveData();
    renderAll();
  });

  /* =========================================================
     ADICIONAR INGREDIENTE À FICHA
  ========================================================= */

  const formFichaItem = document.getElementById("f-ficha-item");

  formFichaItem?.addEventListener("submit", (event) => {
    event.preventDefault();

    const fichaId =
      document.getElementById("fichaId").value;

    const ingredienteId =
      document.getElementById("ingredienteId").value;

    const quantidadeUso = Number(
      document.getElementById("quantidadeUso").value
    );

    if (
      !fichaId ||
      !ingredienteId ||
      !Number.isFinite(quantidadeUso) ||
      quantidadeUso <= 0
    ) {
      return;
    }

    const ficha = getFicha(fichaId);

    if (!ficha) {
      return;
    }

    if (!Array.isArray(ficha.itens)) {
      ficha.itens = [];
    }

    ficha.itens.push({
      ingredienteId,
      quantidadeUso,
    });

    recalculateFicha(ficha);
    syncSalesForFicha(ficha.id);

    saveData();
    renderAll();
  });

  /* =========================================================
     FILTRO
  ========================================================= */

  const filtro = document.getElementById(
    "filtro-ficha-produto"
  );

  filtro?.addEventListener("input", (event) => {
    const cursorPosition = event.target.selectionStart;

    renderFichas.searchTerm = event.target.value;

    renderFichas();

    const novoCampo = document.getElementById(
      "filtro-ficha-produto"
    );

    if (novoCampo) {
      novoCampo.focus();

      const position = Math.min(
        cursorPosition ?? novoCampo.value.length,
        novoCampo.value.length
      );

      novoCampo.setSelectionRange(position, position);
    }
  });

  /* =========================================================
     ORDENAÇÃO
  ========================================================= */

  const ordenacao = document.getElementById(
    "ordenacao-ficha"
  );

  ordenacao?.addEventListener("change", (event) => {
    renderFichas.sortOrder = event.target.value;

    renderFichas();
  });

  /* =========================================================
     EDITAR
  ========================================================= */

  panel
    .querySelectorAll("[data-edit-ficha]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        editFicha(button.dataset.editFicha);
      });
    });

  /* =========================================================
     EXCLUIR
  ========================================================= */

panel
  .querySelectorAll(
    "[data-del-ficha]"
  )
  .forEach((button) => {

    button.onclick = () => {

      const fichaId =
        button.dataset.delFicha;

      state.fichas =
        state.fichas.filter(
          (ficha) =>
            ficha.id !== fichaId
        );

      state.vendas =
        state.vendas.filter(
          (sale) =>
            sale.fichaId !== fichaId
        );

      renderAll();

    };

  });
}

/* Estado dos filtros da Ficha Técnica */
renderFichas.searchTerm = "";
renderFichas.sortOrder = "az";

/* =========================================================
   VENDAS
========================================================= */
function renderVendas() {
  const panel = document.getElementById("vendas-panel");

  if (!panel) return;

  const vendasFiltradas = filterAndSort(
    state.vendas,
    renderVendas.searchTerm,
    (sale) => sale.produto,
    renderVendas.sortOrder
  );

  panel.innerHTML = `
    <h2>Venda</h2>

    <button
      class="toggle-btn"
      id="btn-cadastro-venda"
    >
      + Cadastrar Venda
    </button>

    <form id="f-venda">

      <select
        required
        name="fichaId"
      >
        <option value="">
          Selecione o produto final
        </option>

        ${state.fichas
          .map(
            (ficha) => `
              <option value="${ficha.id}">
                ${escapeHTML(ficha.nome)}
              </option>
            `
          )
          .join("")}
      </select>

      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="lucroDesejadoPct"
        placeholder="Lucro desejado (%)"
      />

      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="precoPraticado"
        placeholder="Preço de venda praticado"
      />

      <button type="submit">
        Salvar venda
      </button>

    </form>

    <div class="filters-row">

      <div class="search-box">
        <span class="search-icon">🔎</span>

        <input
          id="filtro-venda-produto"
          type="search"
          placeholder="Buscar produto..."
          value="${escapeHTML(renderVendas.searchTerm)}"
        />
      </div>

      <select
        id="ordenacao-venda"
        class="sort-select"
      >
        <option
          value="az"
          ${renderVendas.sortOrder === "az" ? "selected" : ""}
        >
          A → Z
        </option>

        <option
          value="za"
          ${renderVendas.sortOrder === "za" ? "selected" : ""}
        >
          Z → A
        </option>
      </select>

    </div>

    <div
      id="info-filtro-venda"
      class="filter-info"
    >
      ${vendasFiltradas.length} venda(s) encontrada(s)
    </div>

    <table>

      <thead>
        <tr>
          <th>Produto</th>
          <th>Preço sugerido</th>
          <th>Praticado</th>
          <th>Status</th>
          <th>Lucro</th>
          <th>Ficha</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>

        ${
          vendasFiltradas.length
            ? vendasFiltradas
                .map((sale) => {

                  const currentStatus =
                    calculateSaleStatus(
                      sale.precoPraticado,
                      sale.precoSugerido,
                      sale.lucro,
                      sale.margemPct
                    );

                  sale.status = currentStatus;

                  return `
                    <tr>

                      <td>
                        ${escapeHTML(sale.produto)}
                      </td>

                      <td>
                        ${BRL(sale.precoSugerido)}
                      </td>

                      <td>
                        ${BRL(sale.precoPraticado)}
                      </td>

                      <td>
                        ${statusBadge(currentStatus)}
                      </td>

                      <td>
                        ${BRL(sale.lucro)}
                      </td>

                      <td>
                        <button
                          class="secondary"
                          data-open-ficha="${sale.fichaId}"
                        >
                          Acessar ficha
                        </button>
                      </td>

                      <td>

                        <div class="actions-row">

                          <button
                            class="secondary"
                            data-edit-venda="${sale.id}"
                          >
                            ✏️ Editar
                          </button>

                          <button
                            class="secondary"
                            data-del-venda="${sale.id}"
                          >
                            🗑️ Excluir
                          </button>

                        </div>

                      </td>

                    </tr>
                  `;
                })
                .join("")
            : `
              <tr>
                <td colspan="7">
                  ${
                    renderVendas.searchTerm
                      ? "Nenhuma venda encontrada para essa busca."
                      : "Sem vendas cadastradas."
                  }
                </td>
              </tr>
            `
        }

      </tbody>

    </table>
  `;

  /* =========================================================
     BOTÃO CADASTRO
  ========================================================= */

  panel.querySelector("#btn-cadastro-venda").onclick = () => {

    panel
      .querySelector("#f-venda")
      .scrollIntoView({
        behavior: "smooth",
      });

  };

  /* =========================================================
     CADASTRO DE VENDA
  ========================================================= */

  panel.querySelector("#f-venda").onsubmit = (event) => {

    event.preventDefault();

    const formData = new FormData(event.target);

    const ficha = getFicha(
      formData.get("fichaId")
    );

    if (!ficha) {

      alert(
        "Selecione uma ficha válida."
      );

      return;
    }

    const values = calculateSaleValues(
      ficha,
      Number(
        formData.get("lucroDesejadoPct")
      ),
      Number(
        formData.get("precoPraticado")
      )
    );

    state.vendas.push({

      id: uid(),

      fichaId:
        ficha.id,

      produto:
        ficha.nome,

      ...values,

    });

    event.target.reset();

    renderAll();

  };

  /* =========================================================
     FILTRO DE BUSCA
  ========================================================= */

  const filtro =
    panel.querySelector(
      "#filtro-venda-produto"
    );

  filtro?.addEventListener(
    "input",
    (event) => {

      const cursorPosition =
        event.target.selectionStart;

      renderVendas.searchTerm =
        event.target.value;

      renderVendas();

      const novoCampo =
        document.getElementById(
          "filtro-venda-produto"
        );

      if (novoCampo) {

        novoCampo.focus();

        const position =
          Math.min(
            cursorPosition ?? novoCampo.value.length,
            novoCampo.value.length
          );

        novoCampo.setSelectionRange(
          position,
          position
        );

      }

    }
  );

  /* =========================================================
     ORDENAÇÃO
  ========================================================= */

  const ordenacao =
    panel.querySelector(
      "#ordenacao-venda"
    );

  ordenacao?.addEventListener(
    "change",
    (event) => {

      renderVendas.sortOrder =
        event.target.value;

      renderVendas();

    }
  );

  /* =========================================================
     EDITAR VENDA
  ========================================================= */

  panel
    .querySelectorAll(
      "[data-edit-venda]"
    )
    .forEach((button) => {

      button.onclick = () => {

        editVenda(
          button.dataset.editVenda
        );

      };

    });

  /* =========================================================
     EXCLUIR VENDA
  ========================================================= */

  panel
    .querySelectorAll(
      "[data-del-venda]"
    )
    .forEach((button) => {

      button.onclick = () => {

        state.vendas =
          state.vendas.filter(
            (sale) =>
              sale.id !==
              button.dataset.delVenda
          );

        renderAll();

      };

    });

  /* =========================================================
     ACESSAR FICHA
  ========================================================= */

  panel
    .querySelectorAll(
      "[data-open-ficha]"
    )
    .forEach((button) => {

      button.onclick = () => {

        showTab("fichas");

      };

    });

  /* =========================================================
     ESTADO DOS FILTROS
  ========================================================= */

}

renderVendas.searchTerm = "";
renderVendas.sortOrder = "az";

/* =========================================================
   MODAL
========================================================= */

function createModal(
  title,
  bodyHTML,
  onSubmit
) {

  closeModal();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.className =
    "modal-overlay";


  overlay.id =
    "app-modal";


  overlay.innerHTML = `

    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >


      <div
        class="modal-header"
      >

        <div>

          <h3
            id="modal-title"
          >
            ${escapeHTML(
              title
            )}
          </h3>

        </div>


        <button
          type="button"
          class="modal-close"
          data-modal-close
          aria-label="Fechar"
        >
          ×
        </button>

      </div>


      <form
        id="modal-form"
      >

        <div
          class="modal-body"
        >

          ${bodyHTML}

        </div>


        <div
          class="modal-actions"
        >

          <button
            type="button"
            class="secondary"
            data-modal-close
          >
            Cancelar
          </button>


          <button
            type="submit"
          >
            Salvar alterações
          </button>

        </div>

      </form>

    </div>

  `;


  document.body.appendChild(
    overlay
  );


  overlay
    .querySelectorAll(
      "[data-modal-close]"
    )
    .forEach(
      (button) => {

        button.onclick =
          closeModal;

      }
    );


  overlay.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        overlay
      ) {

        closeModal();

      }

    }
  );


  overlay.querySelector(
    "#modal-form"
  ).onsubmit =
    (event) => {

      event.preventDefault();


      const result =
        onSubmit(
          new FormData(
            event.target
          ),

          event.target,

          overlay
        );


      if (
        result !== false
      ) {

        closeModal();

      }

    };


  const firstInput =
    overlay.querySelector(
      "input, select"
    );


  firstInput?.focus();

}


function closeModal() {

  document
    .getElementById(
      "app-modal"
    )
    ?.remove();

}


/* =========================================================
   EDITAR CUSTO
========================================================= */

function editCusto(id) {

  const cost =
    state.custos.find(
      (item) =>
        item.id === id
    );


  if (!cost) return;


  createModal(

    "Editar custo",

    `

      <label>
        Descrição
      </label>


      <input
        required
        name="descricao"
        value="${escapeHTML(
          cost.descricao
        )}"
      />


      <label>
        Categoria
      </label>


      <input
        required
        name="categoria"
        value="${escapeHTML(
          cost.categoria
        )}"
      />


      <label>
        Valor
      </label>


      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="valor"
        value="${Number(
          cost.valor || 0
        )}"
      />

    `,

    (formData) => {

      cost.descricao =
        String(
          formData.get(
            "descricao"
          ) || ""
        ).trim();


      cost.categoria =
        String(
          formData.get(
            "categoria"
          ) || ""
        ).trim();


      cost.valor =
        Number(
          formData.get(
            "valor"
          )
        );


      renderAll();

    }

  );

}


/* =========================================================
   EDITAR INGREDIENTE
========================================================= */

function editIngrediente(
  id
) {

  const ingredient =
    getIngredient(id);


  if (!ingredient) return;


  createModal(

    "Editar ingrediente",

    `

      <label>
        Produto
      </label>


      <input
        required
        name="produto"
        value="${escapeHTML(
          ingredient.produto
        )}"
      />


      <label>
        Unidade
      </label>


      <input
        required
        name="unidade"
        value="${escapeHTML(
          ingredient.unidade
        )}"
      />


      <label>
        Quantidade de compra
      </label>


      <input
        required
        type="number"
        min="0.01"
        step="0.01"
        name="quantidade"
        value="${Number(
          ingredient.quantidade || 0
        )}"
      />


      <label>
        Valor da compra
      </label>


      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="valor"
        value="${Number(
          ingredient.valorCompra || 0
        )}"
      />


      <small>
        O valor unitário será recalculado automaticamente.
      </small>

    `,

    (formData) => {

      const quantidade =
        Number(
          formData.get(
            "quantidade"
          )
        );


      const valorCompra =
        Number(
          formData.get(
            "valor"
          )
        );


      if (
        quantidade <= 0
      ) {

        alert(
          "A quantidade de compra deve ser maior que zero."
        );

        return false;

      }


      ingredient.produto =
        String(
          formData.get(
            "produto"
          ) || ""
        ).trim();


      ingredient.unidade =
        String(
          formData.get(
            "unidade"
          ) || ""
        ).trim();


      ingredient.quantidade =
        quantidade;


      ingredient.valorCompra =
        valorCompra;


      ingredient.valorUnitario =
        valorCompra /
        quantidade;


      recalculateAllFichas();


      renderAll();

    }

  );

}


/* =========================================================
   EXCLUIR INGREDIENTE
========================================================= */

function deleteIngrediente(
  id
) {

  const usedInFicha =
    state.fichas.some(
      (ficha) =>
        ficha.itens?.some(
          (item) =>
            item.ingredienteId ===
            id
        )
    );


  if (usedInFicha) {

    alert(
      "Este ingrediente está sendo usado em uma ou mais fichas técnicas. Edite ou remova o ingrediente da ficha antes de excluí-lo."
    );

    return;

  }


  state.ingredientes =
    state.ingredientes.filter(
      (ingredient) =>
        ingredient.id !==
        id
    );


  renderAll();

}


/* =========================================================
   EDITAR FICHA
========================================================= */

function editFicha(id) {

  const ficha =
    getFicha(id);


  if (!ficha) return;


  const items =
    Array.isArray(
      ficha.itens
    )
      ? ficha.itens
      : [];


  createModal(

    "Editar ficha técnica",

    `

      <label>
        Produto final
      </label>


      <input
        required
        name="nome"
        value="${escapeHTML(
          ficha.nome
        )}"
      />


      <div
        class="modal-section-title"
      >
        Ingredientes da ficha
      </div>


      <div
        id="ficha-edit-items"
      >

        ${items
          .map(
            (item) =>
              fichaItemEditorRow(
                item
              )
          )
          .join("")}

      </div>


      <div
        class="ficha-add-item"
      >

        <select
          id="novo-ficha-ingrediente"
        >

          <option value="">
            Adicionar ingrediente...
          </option>


          ${state.ingredientes
            .map(
              (ingredient) => `

                <option
                  value="${ingredient.id}"
                >
                  ${escapeHTML(
                    ingredient.produto
                  )}

                  (${escapeHTML(
                    ingredient.unidade
                  )})

                </option>

              `
            )
            .join("")}

        </select>


        <input
          id="novo-ficha-qtd"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Quantidade"
        />


        <button
          type="button"
          id="btn-add-ficha-item"
        >
          Adicionar
        </button>

      </div>


      <small>
        Alterações nos ingredientes recalculam automaticamente o custo da ficha e das vendas vinculadas.
      </small>

    `,

    (
      formData,
      formElement,
      overlay
    ) => {

      const nome =
        String(
          formData.get(
            "nome"
          ) || ""
        ).trim();


      if (!nome) {

        alert(
          "Informe o nome do produto."
        );

        return false;

      }


      const rows = [
        ...overlay.querySelectorAll(
          ".ficha-item-row"
        ),
      ];


      const newItems = [];


      for (
        const row of rows
      ) {

        const ingredientId =
          row.dataset
            .ingredientId;


        const qtd =
          Number(
            row.querySelector(
              ".ficha-item-qtd"
            )?.value
          );


        const ingredient =
          getIngredient(
            ingredientId
          );


        if (
          !ingredient ||
          qtd <= 0
        ) {

          alert(
            "Verifique os ingredientes e quantidades da ficha."
          );

          return false;

        }


        newItems.push({

          ingredienteId:
            ingredient.id,

          produto:
            ingredient.produto,

          unidade:
            ingredient.unidade,

          qtd,

          custo:
            qtd *
            Number(
              ingredient.valorUnitario ||
                0
            ),

        });

      }


      ficha.nome =
        nome;


      ficha.itens =
        newItems;


      recalculateFicha(
        ficha
      );


      syncSalesForFicha(
        ficha.id
      );


      renderAll();

    }

  );


  const overlay =
    document.getElementById(
      "app-modal"
    );


  if (!overlay) return;


  overlay.querySelector(
    "#btn-add-ficha-item"
  ).onclick =
    () => {

      const ingredientId =
        overlay.querySelector(
          "#novo-ficha-ingrediente"
        ).value;


      const qtd =
        Number(
          overlay.querySelector(
            "#novo-ficha-qtd"
          ).value
        );


      const ingredient =
        getIngredient(
          ingredientId
        );


      if (
        !ingredient ||
        qtd <= 0
      ) {

        alert(
          "Selecione um ingrediente e informe uma quantidade válida."
        );

        return;

      }


      const container =
        overlay.querySelector(
          "#ficha-edit-items"
        );


      container.insertAdjacentHTML(
        "beforeend",

        fichaItemEditorRow({

          ingredienteId:
            ingredient.id,

          produto:
            ingredient.produto,

          unidade:
            ingredient.unidade,

          qtd,

        })

      );


      overlay.querySelector(
        "#novo-ficha-ingrediente"
      ).value = "";


      overlay.querySelector(
        "#novo-ficha-qtd"
      ).value = "";


      bindFichaItemRemoveButtons(
        overlay
      );

    };


  bindFichaItemRemoveButtons(
    overlay
  );

}


function fichaItemEditorRow(
  item
) {

  return `

    <div
      class="ficha-item-row"
      data-ingredient-id="${item.ingredienteId}"
    >

      <span
        class="ficha-item-name"
      >
        ${escapeHTML(
          item.produto
        )}
      </span>


      <span
        class="ficha-item-unit"
      >
        ${escapeHTML(
          item.unidade
        )}
      </span>


      <input
        class="ficha-item-qtd"
        type="number"
        min="0.01"
        step="0.01"
        value="${Number(
          item.qtd || 0
        )}"
        required
      />


      <button
        type="button"
        class="secondary ficha-item-remove"
      >
        Remover
      </button>

    </div>

  `;

}


function bindFichaItemRemoveButtons(
  overlay
) {

  overlay
    .querySelectorAll(
      ".ficha-item-remove"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            button
              .closest(
                ".ficha-item-row"
              )
              ?.remove();

          };

      }
    );

}


/* =========================================================
   EDITAR VENDA
========================================================= */

function editVenda(id) {

  const sale =
    state.vendas.find(
      (item) =>
        item.id === id
    );


  if (!sale) return;


  createModal(

    "Editar venda",

    `

      <label>
        Produto final
      </label>


      <select
        required
        name="fichaId"
      >

        ${state.fichas
          .map(
            (ficha) => `

              <option
                value="${ficha.id}"

                ${
                  ficha.id ===
                  sale.fichaId
                    ? "selected"
                    : ""
                }
              >

                ${escapeHTML(
                  ficha.nome
                )}

              </option>

            `
          )
          .join("")}

      </select>


      <label>
        Lucro desejado (%)
      </label>


      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="lucroDesejadoPct"
        value="${Number(
          sale.lucroDesejadoPct ||
            0
        )}"
      />


      <label>
        Preço de venda praticado
      </label>


      <input
        required
        type="number"
        min="0"
        step="0.01"
        name="precoPraticado"
        value="${Number(
          sale.precoPraticado ||
            0
        )}"
      />


      <small>
        Preço sugerido, lucro, margem e status serão recalculados automaticamente.
      </small>

    `,

    (formData) => {

      const ficha =
        getFicha(
          formData.get(
            "fichaId"
          )
        );


      if (!ficha) {

        alert(
          "Selecione uma ficha válida."
        );

        return false;

      }


      const values =
        calculateSaleValues(

          ficha,

          Number(
            formData.get(
              "lucroDesejadoPct"
            )
          ),

          Number(
            formData.get(
              "precoPraticado"
            )
          )

        );


      sale.fichaId =
        ficha.id;


      sale.produto =
        ficha.nome;


      Object.assign(
        sale,
        values
      );


      renderAll();

    }

  );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

renderTabs();

showTab(
  "dashboard"
);

renderAll();