const panelNames = ["home", "about", "products", "moments", "contact"];
const links = document.querySelectorAll("[data-panel-link]");
const panels = document.querySelectorAll("[data-panel]");
const hideTimers = new WeakMap();
const exhibitionList = document.querySelector("[data-exhibition-list]");
const exhibitionPrevButton = document.querySelector("[data-exhibition-prev]");
const exhibitionNextButton = document.querySelector("[data-exhibition-next]");
const exhibitionMobileQuery = window.matchMedia("(max-width: 560px)");
const exhibitionDesktopPageSize = 3;
const isAdminPreview = new URLSearchParams(window.location.search).get("preview") === "admin";
let exhibitionItems = [];
let exhibitionPageIndex = 0;
let exhibitionAnimationTimer;
let productItemsData = [];
let activeProductId = null;
let activeProductImageIndex = 0;
const productFilters = {
  latestOnly: false,
  inStockOnly: false,
  types: new Set(),
};
let productFilterMenuOpen = false;
let communitySectionsData = [];
let activeActivitySectionId = null;
let activeActivityPhotoId = null;
const reloadStateKey = "zdc-reload-view-state";
const panelTransitionMs = 430;
let reloadStateSaveFrame = null;
let activePanelName = "home";

function resetProductDetailView() {
  if (!activeProductId) {
    return;
  }

  activeProductId = null;
  activeProductImageIndex = 0;

  if (productItemsData.length) {
    renderProducts(productItemsData);
  }
}

function resetCommunityView() {
  if (!activeActivitySectionId && !activeActivityPhotoId) {
    return;
  }

  activeActivitySectionId = null;
  activeActivityPhotoId = null;

  if (communitySectionsData.length) {
    renderCommunitySections(communitySectionsData);
  }
}

function normalizePanelName(name) {
  return panelNames.includes(name) ? name : "home";
}

function getPanelIndex(name) {
  return panelNames.indexOf(normalizePanelName(name));
}

function getActivePanelName() {
  const activePanel = document.querySelector(".panel.is-active");

  return normalizePanelName(activePanel?.dataset.panel || activePanelName);
}

function getNavigationType() {
  const navigation =
    window.performance &&
    typeof window.performance.getEntriesByType === "function"
      ? window.performance.getEntriesByType("navigation")[0]
      : null;

  if (navigation && navigation.type) {
    return navigation.type;
  }

  if (window.performance && window.performance.navigation?.type === 1) {
    return "reload";
  }

  return "";
}

function getCurrentPanelName() {
  return normalizePanelName(location.hash.slice(1));
}

function getSavedReloadState() {
  const navigationType = getNavigationType();

  if (navigationType && navigationType !== "reload") {
    return null;
  }

  try {
    const historyState =
      history.state && typeof history.state === "object"
        ? history.state.zdcReloadState
        : null;
    const sessionState = JSON.parse(sessionStorage.getItem(reloadStateKey) || "null");
    const state = historyState || sessionState;
    const currentPath = `${location.pathname}${location.search}`;

    if (
      !state ||
      state.path !== currentPath ||
      Date.now() - Number(state.savedAt || 0) > 10 * 60 * 1000
    ) {
      return null;
    }

    return state;
  } catch (error) {
    return null;
  }
}

function createReloadState() {
  return {
    path: `${location.pathname}${location.search}`,
    hash: location.hash,
    panel: getCurrentPanelName(),
    scrollY: window.scrollY,
    activeProductId,
    activeProductImageIndex,
    activeActivitySectionId,
    activeActivityPhotoId,
    productFilterMenuOpen,
    productFilters: {
      latestOnly: productFilters.latestOnly,
      inStockOnly: productFilters.inStockOnly,
      types: Array.from(productFilters.types),
    },
    savedAt: Date.now(),
  };
}

function saveReloadState() {
  const reloadState = createReloadState();

  try {
    sessionStorage.setItem(reloadStateKey, JSON.stringify(reloadState));
  } catch (error) {
    // 忽略无法写入临时状态的浏览器环境。
  }

  try {
    const currentState =
      history.state && typeof history.state === "object" ? history.state : {};
    history.replaceState(
      {
        ...currentState,
        zdcReloadState: reloadState,
      },
      "",
      location.href,
    );
  } catch (error) {
    // 忽略无法写入浏览记录状态的浏览器环境。
  }
}

function scheduleReloadStateSave() {
  if (reloadStateSaveFrame !== null) {
    return;
  }

  reloadStateSaveFrame = requestAnimationFrame(() => {
    reloadStateSaveFrame = null;
    saveReloadState();
  });
}

function applySavedViewState(state) {
  if (!state) {
    return;
  }

  if (state.hash && state.hash !== location.hash) {
    history.replaceState(null, "", state.hash);
  }

  activeProductId = state.activeProductId || null;
  activeProductImageIndex = Number(state.activeProductImageIndex) || 0;
  activeActivitySectionId = state.activeActivitySectionId || null;
  activeActivityPhotoId = state.activeActivityPhotoId || null;
  productFilterMenuOpen = Boolean(state.productFilterMenuOpen);

  if (state.productFilters) {
    productFilters.latestOnly = Boolean(state.productFilters.latestOnly);
    productFilters.inStockOnly = Boolean(state.productFilters.inStockOnly);
    productFilters.types = new Set(
      Array.isArray(state.productFilters.types) ? state.productFilters.types : [],
    );
  }
}

function scrollToPanelStart() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });
}

function restoreSavedScroll(state) {
  if (!state || !Number.isFinite(Number(state.scrollY))) {
    return;
  }

  const scrollTop = Number(state.scrollY);
  const restore = () => {
    window.scrollTo({
      top: scrollTop,
      left: 0,
      behavior: "auto",
    });
  };

  requestAnimationFrame(() => {
    restore();
    window.setTimeout(restore, 90);
    window.setTimeout(restore, 260);
  });
}

function getExhibitionPageSize() {
  return exhibitionMobileQuery.matches ? 2 : exhibitionDesktopPageSize;
}

function showPanel(name, shouldFocus = false, shouldResetScroll = false) {
  const nextPanel = normalizePanelName(name);
  const previousPanel = getActivePanelName();
  const previousIndex = getPanelIndex(previousPanel);
  const nextIndex = getPanelIndex(nextPanel);
  const direction =
    nextIndex === previousIndex ? 0 : nextIndex > previousIndex ? 1 : -1;
  const enterClass =
    direction > 0
      ? "is-entering-from-right"
      : direction < 0
        ? "is-entering-from-left"
        : "";
  const leaveClass =
    direction > 0
      ? "is-leaving-to-left"
      : direction < 0
        ? "is-leaving-to-right"
        : "";

  links.forEach((link) => {
    const isActive = link.dataset.panelLink === nextPanel;
    link.classList.toggle("is-active", isActive);

    if (link.getAttribute("role") === "tab") {
      link.setAttribute("aria-selected", String(isActive));
    }
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.panel === nextPanel;
    const wasActive = panel.classList.contains("is-active") && !panel.hidden;

    if (isActive) {
      window.clearTimeout(hideTimers.get(panel));
      panel.hidden = false;
      panel.classList.remove(
        "is-active",
        "is-leaving-to-left",
        "is-leaving-to-right",
      );

      if (enterClass) {
        panel.classList.add(enterClass);
        void panel.offsetWidth;
      }

      requestAnimationFrame(() => {
        panel.classList.add("is-active");
        panel.classList.remove("is-entering-from-left", "is-entering-from-right");

        if (shouldFocus) {
          panel.focus({ preventScroll: true });
        }
      });

      return;
    }

    window.clearTimeout(hideTimers.get(panel));
    panel.classList.remove("is-active");

    if (wasActive && leaveClass) {
      panel.classList.add(leaveClass);
    } else {
      panel.classList.remove("is-leaving-to-left", "is-leaving-to-right");
    }

    hideTimers.set(
      panel,
      window.setTimeout(() => {
        panel.classList.remove("is-leaving-to-left", "is-leaving-to-right");
        panel.hidden = true;
      }, panelTransitionMs),
    );
  });

  activePanelName = nextPanel;

  if (shouldResetScroll) {
    requestAnimationFrame(scrollToPanelStart);
    window.setTimeout(scrollToPanelStart, 80);
  }
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (typeof text === "string") {
    element.textContent = text;
  }

  return element;
}

function setTextWithBreaks(element, value) {
  if (!element) {
    return;
  }

  element.textContent = "";
  String(value || "")
    .split("\n")
    .forEach((line, index) => {
      if (index > 0) {
        element.append(document.createElement("br"));
      }

      element.append(document.createTextNode(line));
    });
}

function appendEmptyState(container, text) {
  container.textContent = "";
  container.append(createElement("p", "empty-state", text));
}

function createInfoLabel(text) {
  const label = String(text || "项目").replace(/\s+/g, " ").trim() || "项目";
  const dt = createElement("dt", "info-label");
  const textWrap = createElement("span", "info-label-text");
  const chars = Array.from(label);

  textWrap.classList.toggle("is-spread", chars.length > 1 && chars.length < 4);
  textWrap.classList.toggle("is-fixed", chars.length <= 4);

  chars.forEach((char) => {
    textWrap.append(createElement("span", "info-label-char", char));
  });

  dt.append(textWrap);
  return dt;
}

function getDateParts(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    time: date.getTime(),
  };
}

function formatFixedDate(value) {
  const parts = getDateParts(value);

  if (parts) {
    return parts.value;
  }

  return String(value || "").trim();
}

function sortByDateAsc(items) {
  return items
    .map((item, index) => {
      const parts = getDateParts(item.date);

      return {
        ...item,
        originalIndex: index,
        sortTime: parts ? parts.time : Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => a.sortTime - b.sortTime || a.originalIndex - b.originalIndex);
}

function sortByDateDesc(items) {
  return items
    .map((item, index) => {
      const parts = getDateParts(item.date);

      return {
        ...item,
        originalIndex: index,
        sortTime: parts ? parts.time : Number.NEGATIVE_INFINITY,
      };
    })
    .sort((a, b) => b.sortTime - a.sortTime || a.originalIndex - b.originalIndex);
}

function getProductAttributes(product) {
  if (Array.isArray(product.attributes)) {
    return product.attributes;
  }

  return Object.entries(product.params || {}).map(([label, value]) => ({
    label,
    value,
  }));
}

function normalizeProductTypeName(type) {
  return type === "挂件" ? "手作" : type || "其他";
}

function getProductType(product) {
  return normalizeProductTypeName(product.type || product.category || "其他");
}

function hasNumericPrice(product) {
  return /\d+(?:\.\d+)?/.test(String(product.price || ""));
}

function getLatestProducts(products) {
  let latestTime = Number.NEGATIVE_INFINITY;

  products.forEach((product) => {
    const time = Date.parse(product.publishDate || "");

    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
    }
  });

  if (!Number.isFinite(latestTime)) {
    return [];
  }

  return products.filter((product) => Date.parse(product.publishDate || "") === latestTime);
}

function getProductTypeOptions(products) {
  const seen = new Set();
  const types = [];

  products.forEach((product) => {
    const type = getProductType(product);

    if (!seen.has(type)) {
      seen.add(type);
      types.push(type);
    }
  });

  return types;
}

function getFilteredProducts(products) {
  let items = products.filter((product) => {
    const type = getProductType(product);
    const typeMatched = !productFilters.types.size || productFilters.types.has(type);
    const stockMatched = !productFilters.inStockOnly || hasNumericPrice(product);

    return typeMatched && stockMatched;
  });

  if (productFilters.latestOnly) {
    items = getLatestProducts(items);
  }

  return items;
}

function renderProductFilters(products) {
  const filter = createElement("div", "product-filter");
  const toggle = createElement("button", "product-filter-toggle", "筛选");
  const menu = createElement("div", "product-filter-menu");
  const primary = createElement("div", "product-filter-primary");
  const typeGroup = createElement("fieldset", "product-filter-types");
  const typeLegend = createElement("legend", "", "种类");
  const types = getProductTypeOptions(products);

  productFilters.types.forEach((type) => {
    if (!types.includes(type)) {
      productFilters.types.delete(type);
    }
  });

  const latestLabel = createElement("label", "product-filter-check");
  const latestInput = document.createElement("input");
  const stockLabel = createElement("label", "product-filter-check");
  const stockInput = document.createElement("input");
  const clear = createElement("button", "product-filter-clear", "清除筛选");

  filter.classList.toggle("is-open", productFilterMenuOpen);
  toggle.type = "button";
  toggle.dataset.productFilterToggle = "";
  toggle.setAttribute("aria-haspopup", "true");
  toggle.setAttribute("aria-expanded", String(productFilterMenuOpen));
  menu.hidden = !productFilterMenuOpen;

  latestInput.type = "checkbox";
  latestInput.checked = productFilters.latestOnly;
  latestInput.dataset.productFilterLatest = "";
  latestLabel.append(latestInput, createElement("span", "", "最新制品"));

  stockInput.type = "checkbox";
  stockInput.checked = productFilters.inStockOnly;
  stockInput.dataset.productFilterStock = "";
  stockLabel.append(stockInput, createElement("span", "", "在售"));

  clear.type = "button";
  clear.dataset.productFilterClear = "";
  clear.hidden =
    !productFilters.latestOnly && !productFilters.inStockOnly && !productFilters.types.size;
  primary.append(latestLabel, stockLabel, clear);

  typeGroup.append(typeLegend);
  types.forEach((type) => {
    const label = createElement("label", "product-filter-check");
    const input = document.createElement("input");

    input.type = "checkbox";
    input.checked = productFilters.types.has(type);
    input.value = type;
    input.dataset.productFilterType = "";
    label.append(input, createElement("span", "", type));
    typeGroup.append(label);
  });

  menu.append(primary, typeGroup);
  filter.append(toggle, menu);
  return filter;
}

function setProductFilterMenuOpen(isOpen) {
  productFilterMenuOpen = isOpen;

  document.querySelectorAll(".product-filter").forEach((filter) => {
    const toggle = filter.querySelector("[data-product-filter-toggle]");
    const menu = filter.querySelector(".product-filter-menu");

    filter.classList.toggle("is-open", productFilterMenuOpen);

    if (toggle) {
      toggle.setAttribute("aria-expanded", String(productFilterMenuOpen));
    }

    if (menu) {
      menu.hidden = !productFilterMenuOpen;
    }
  });
}

function getProductImages(product) {
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.filter((image) => image && image.src);
  }

  if (product.image && product.image.src) {
    return [product.image];
  }

  return [];
}

function supportsFullBookDocument(product) {
  return String(product.name || "").trim() === "川源梦华录";
}

function normalizeProductDocument(document) {
  if (typeof document === "string") {
    return { src: document };
  }

  if (document && typeof document === "object" && !Array.isArray(document)) {
    return {
      src: document.src || document.url || document.href || "",
      name: document.name || document.label || "",
    };
  }

  return { src: "", name: "" };
}

function createProductDocumentLinks(product) {
  const documents = product.documents || {};
  const sample = normalizeProductDocument(documents.sample);
  const full = normalizeProductDocument(documents.full);
  const links = [];

  if (sample.src) {
    links.push({ href: sample.src, label: "部分试阅" });
  }

  if (supportsFullBookDocument(product) && full.src) {
    links.push({ href: full.src, label: "全书阅览" });
  }

  if (!links.length) {
    return null;
  }

  const wrapper = createElement("div", "product-documents");

  links.forEach((item) => {
    const link = createElement("a", "product-document-link", item.label);

    link.href = createProductReaderUrl(item.href, product, item.label);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.documentSource = item.href;
    link.setAttribute("aria-label", `${product.name || "制品"}${item.label}`);
    wrapper.append(link);
  });

  return wrapper;
}

function createProductReaderUrl(fileSrc, product, label) {
  const readerUrl = new URL("reader.html", window.location.href);

  readerUrl.searchParams.set("file", fileSrc);
  readerUrl.searchParams.set("title", `${product.name || "制品"} · ${label}`);

  return readerUrl.href;
}

function createImageSlot(product, imageOverride = null, variant = "thumbnail") {
  const slot = createElement("span", `image-slot image-slot-${variant}`);
  const image = imageOverride || getProductImages(product)[0] || product.image || {};

  if (image.src) {
    if (variant === "thumbnail") {
      const background = document.createElement("img");
      background.className = "image-slot-bg";
      background.src = image.src;
      background.alt = "";
      background.loading = "lazy";
      background.setAttribute("aria-hidden", "true");
      slot.append(background);
    }

    const img = document.createElement("img");
    img.className = "image-slot-main";
    img.src = image.src;
    img.alt = image.alt || product.name || "";
    img.loading = "lazy";
    slot.append(img);
  } else {
    slot.setAttribute("aria-label", "制品图片");
  }

  return slot;
}

function createProductImageCarousel(product) {
  const images = getProductImages(product);
  const carousel = createElement("div", "product-image-carousel");
  const stage = createElement("div", "product-image-stage");
  const imageIndex = images.length
    ? Math.min(Math.max(activeProductImageIndex, 0), images.length - 1)
    : 0;

  activeProductImageIndex = imageIndex;
  stage.append(createImageSlot(product, images[imageIndex], "detail"));
  carousel.append(stage);

  if (images.length > 1) {
    const controls = createElement("div", "product-image-controls");
    const prev = createElement("button", "product-image-arrow", "‹");
    const next = createElement("button", "product-image-arrow", "›");

    prev.type = "button";
    prev.dataset.productImagePrev = "";
    prev.setAttribute("aria-label", "上一张制品图片");
    next.type = "button";
    next.dataset.productImageNext = "";
    next.setAttribute("aria-label", "下一张制品图片");
    controls.append(prev, next);
    carousel.append(controls);
  }

  return carousel;
}

function createQrSlot(qrcode) {
  const slot = createElement("span", "qr-slot");
  const image = qrcode.image || {};

  if (image.src) {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt || qrcode.name || "二维码";
    img.loading = "lazy";
    slot.append(img);
  } else {
    slot.setAttribute("aria-label", "二维码");
    slot.append(createElement("span", "", "二维码"));
  }

  return slot;
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function getExternalHref(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (isExternalUrl(raw)) {
    return raw;
  }

  if (/^www\./i.test(raw) || /^[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#].*)?$/i.test(raw)) {
    return `https://${raw}`;
  }

  return "";
}

function createExternalLink(href, text) {
  const link = document.createElement("a");

  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = text;

  return link;
}

function renderNameNumberList(container, items, emptyText, options = {}) {
  if (!container) {
    return;
  }

  container.textContent = "";

  if (!items.length) {
    const empty = createElement("div", "empty-state", emptyText);
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const row = createElement("div", "contact-line");
    const name = createElement("dt");
    const number = createElement("dd");
    const nameText = item.name || "未命名";
    const fallbackValue = Object.prototype.hasOwnProperty.call(
      options,
      "emptyValueText",
    )
      ? options.emptyValueText
      : "未公开";
    const value = item.number || item.value || fallbackValue;
    const nameHref = options.linkName
      ? getExternalHref(item.url || item.href || item.link)
      : "";

    if (nameHref) {
      name.append(createExternalLink(nameHref, nameText));
    } else {
      name.textContent = nameText;
    }

    const valueHref = getExternalHref(value);

    if (valueHref) {
      number.append(createExternalLink(valueHref, value));
    } else {
      number.textContent = value;
    }

    row.append(name, number);
    container.append(row);
  });
}

function renderBrandName(name) {
  const heading = document.querySelector("[data-club-name]");
  const brand = document.querySelector(".brand");
  const brandTitle = document.querySelector(".brand-title");

  if (heading) {
    heading.textContent = name || "子种大川";
  }

  if (brand) {
    brand.setAttribute("aria-label", `回到首页，${name || "子种大川"}`);
  }

  if (!brandTitle || !name) {
    return;
  }

  const chars = Array.from(name).slice(0, 4);
  const charNodes = brandTitle.querySelectorAll(".brand-char");

  charNodes.forEach((node, index) => {
    node.textContent = chars[index] || "";
  });
}

function renderAbout(club) {
  const aboutBody = document.querySelector("[data-about-body]");
  const facts = document.querySelector("[data-club-facts]");

  if (aboutBody) {
    aboutBody.textContent = "";

    const aboutParagraphs = club.about || [];

    if (!aboutParagraphs.length) {
      aboutBody.append(createElement("p", "empty-state", "社团资料整理中。"));
    }

    aboutParagraphs.forEach((paragraph) => {
      aboutBody.append(createElement("p", "", paragraph));
    });
  }

  if (facts) {
    facts.textContent = "";

    const factItems = club.facts || [];

    if (!factItems.length) {
      facts.append(createElement("div", "empty-state", "社团信息整理中。"));
    }

    factItems.forEach((fact) => {
      const row = document.createElement("div");
      row.append(createInfoLabel(fact.label || "项目"));
      row.append(createElement("dd", "", fact.value || "未公开"));
      facts.append(row);
    });
  }
}

function renderExhibitions(exhibitions) {
  if (!exhibitionList) {
    return;
  }

  exhibitionList.textContent = "";

  if (!exhibitions.length) {
    exhibitionItems = [];
    exhibitionPageIndex = 0;
    exhibitionList.append(createElement("p", "empty-state", "近期参展信息整理中。"));

    if (exhibitionPrevButton) {
      exhibitionPrevButton.disabled = true;
    }

    if (exhibitionNextButton) {
      exhibitionNextButton.disabled = true;
    }

    return;
  }

  const items = sortByDateAsc(exhibitions);

  items.forEach((item) => {
    const article = createElement("article", "exhibition-item");
    const main = createElement("div", "exhibition-main");
    const title = createElement("h3", "", item.name || "未命名展会");
    const detail = createElement("p", "exhibition-detail");
    const note = createElement("small", "exhibition-note", item.note || "");

    detail.append(
      createElement("span", "exhibition-date", formatFixedDate(item.date) || "日期未公开"),
      createElement("span", "exhibition-location", item.location || "地点未公开"),
    );
    article.dataset.exhibitionItem = "";
    main.append(title, detail);
    article.append(main, note);
    exhibitionList.append(article);
  });

  exhibitionItems = Array.from(
    exhibitionList.querySelectorAll("[data-exhibition-item]"),
  );
  exhibitionPageIndex = 0;
  renderExhibitionPage();
}

function renderProducts(products) {
  const productList = document.querySelector("[data-product-list]");
  const filterSlot = document.querySelector("[data-product-filter-slot]");

  if (!productList) {
    return;
  }

  if (filterSlot) {
    filterSlot.textContent = "";
  }

  const sortedProducts = products
    .map((product, index) => ({ ...product, originalIndex: index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.publishDate || "");
      const bTime = Date.parse(b.publishDate || "");
      const aHasDate = Number.isFinite(aTime);
      const bHasDate = Number.isFinite(bTime);

      if (aHasDate && bHasDate) {
        return bTime - aTime;
      }

      if (aHasDate) {
        return -1;
      }

      if (bHasDate) {
        return 1;
      }

      return a.originalIndex - b.originalIndex;
    });

  productItemsData = sortedProducts;

  if (!sortedProducts.length) {
    activeProductId = null;
    appendEmptyState(productList, "制品资料整理中。");
    return;
  }

  if (!sortedProducts.some((product) => product.id === activeProductId)) {
    activeProductId = null;
  }

  const activeProduct = sortedProducts.find((product) => product.id === activeProductId);

  productList.textContent = "";
  productList.classList.toggle("is-detail-view", Boolean(activeProduct));
  if (filterSlot) {
    filterSlot.hidden = Boolean(activeProduct);
  }

  const detail = createElement("section", "product-detail");
  detail.dataset.productDetail = "";

  if (activeProduct) {
    const media = createElement("div", "product-detail-media");
    const imageCarousel = createProductImageCarousel(activeProduct);
    const body = createElement("div", "product-detail-body");
    const label = createElement(
      "p",
      "item-label",
      activeProduct.type || activeProduct.category || "制品",
    );
    const title = createElement("h3");
    const description = createElement("p");
    const price = createElement("p", "product-price");
    const documents = createProductDocumentLinks(activeProduct);
    const params = createElement("dl", "product-params");
    const close = createElement("button", "product-detail-close", "返回");

    setTextWithBreaks(title, activeProduct.name || "未命名制品");
    setTextWithBreaks(description, activeProduct.description || "制品简介整理中。");
    setTextWithBreaks(
      price,
      activeProduct.price ? `价格：${activeProduct.price}` : "价格未公开",
    );
    close.type = "button";
    close.dataset.productClose = "";
    if (activeProduct.publishDate) {
      const row = document.createElement("div");
      row.append(createInfoLabel("发布日期"));
      row.append(createElement("dd", "", activeProduct.publishDate));
      params.append(row);
    }

    getProductAttributes(activeProduct).forEach((attribute) => {
      if (!attribute.label && !attribute.value) {
        return;
      }

      const row = document.createElement("div");
      const value = createElement("dd");

      setTextWithBreaks(value, attribute.value || "未公开");
      row.append(createInfoLabel(attribute.label || "参数"));
      row.append(value);
      params.append(row);
    });

    media.append(imageCarousel);
    body.append(label, title, description, price);

    if (documents) {
      body.append(documents);
    }

    if (params.children.length) {
      body.append(params);
    }

    detail.append(close, media, body);
    productList.append(detail);
    return;
  }

  const filteredProducts = getFilteredProducts(sortedProducts);
  const gallery = createElement("div", "product-gallery");

  if (filterSlot) {
    filterSlot.append(renderProductFilters(sortedProducts));
  }

  if (!filteredProducts.length) {
    productList.append(createElement("p", "empty-state", "没有符合筛选条件的制品。"));
    return;
  }

  filteredProducts.forEach((product) => {
    const article = createElement("article", "product-item product-gallery-item");
    const imageButton = createElement("button", "product-gallery-image");
    const image = createImageSlot(product);
    const titleButton = createElement("button", "product-gallery-caption");
    const productName = String(product.name || "制品").replace(/\s+/g, "");

    setTextWithBreaks(titleButton, product.name || "未命名制品");
    article.dataset.productId = product.id;
    imageButton.type = "button";
    imageButton.dataset.productSelect = product.id;
    imageButton.setAttribute("aria-label", `查看${productName || "制品"}详情`);
    titleButton.type = "button";
    titleButton.dataset.productSelect = product.id;
    titleButton.setAttribute("aria-expanded", "false");
    imageButton.append(image);
    article.append(imageButton, titleButton);
    gallery.append(article);
  });

  productList.append(gallery);
}

function getActivityPhotos(section) {
  return Array.isArray(section.photos) ? section.photos : [];
}

function createCommunityPlaceholder(text = "照片整理中") {
  const placeholder = createElement("span", "community-placeholder", text);
  return placeholder;
}

function createCommunityCover(section, index) {
  const coverButton = createElement("button", "community-cover");
  const cover = section.cover && section.cover.src ? section.cover : null;
  const photoImages = getActivityPhotos(section)
    .filter((photo) => photo.image && photo.image.src)
    .slice(0, 5);

  coverButton.type = "button";
  coverButton.dataset.communitySectionSelect = section.id;
  coverButton.setAttribute(
    "aria-label",
    `查看${section.name || `活动分区 ${index + 1}`}`,
  );

  if (cover) {
    const image = document.createElement("img");
    image.src = cover.src;
    image.alt = cover.alt || section.name || "";
    image.loading = "lazy";
    coverButton.append(image);
  } else if (photoImages.length) {
    const collage = createElement("span", "community-cover-collage");

    photoImages.forEach((photo, photoIndex) => {
      const image = document.createElement("img");
      image.src = photo.image.src;
      image.alt = photo.image.alt || photo.activity || section.name || "";
      image.loading = "lazy";
      image.style.setProperty("--photo-index", photoIndex);
      collage.append(image);
    });

    coverButton.append(collage);
  } else {
    coverButton.append(createCommunityPlaceholder());
  }

  coverButton.append(createElement("span", "community-cover-fade"));
  return coverButton;
}

function createCommunityCopy(section, index) {
  const copy = createElement("div", "community-copy");
  const title = createElement("button", "community-title");
  const description = createElement("p");

  title.type = "button";
  title.dataset.communitySectionSelect = section.id;
  title.textContent = section.name || `活动分区 ${index + 1}`;
  setTextWithBreaks(description, section.description || "活动说明整理中。");
  copy.append(title, description);
  return copy;
}

function renderCommunityOverview(container, sections) {
  sections.forEach((section, index) => {
    const article = createElement("article", "community-section");

    if (index % 2 === 1) {
      article.classList.add("is-reversed");
    }

    article.append(createCommunityCopy(section, index), createCommunityCover(section, index));
    container.append(article);
  });
}

function createCommunityPhotoButton(section, photo) {
  const button = createElement("button", "community-photo-item");

  button.type = "button";
  button.dataset.communityPhotoSelect = photo.id;
  button.setAttribute(
    "aria-label",
    `查看${photo.activity || section.name || "活动照片"}`,
  );

  if (photo.image && photo.image.src) {
    button.style.setProperty("--photo-bg", `url(${JSON.stringify(photo.image.src)})`);

    const image = document.createElement("img");
    image.src = photo.image.src;
    image.alt = photo.image.alt || photo.activity || section.name || "";
    image.loading = "lazy";
    image.addEventListener("load", () => {
      setCommunityPhotoAspect(button, image);
    });

    if (image.complete) {
      setCommunityPhotoAspect(button, image);
    }

    button.append(image);
  } else {
    button.append(createCommunityPlaceholder("图片待上传"));
  }

  return button;
}

function setCommunityPhotoAspect(button, image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  if (!width || !height) {
    return;
  }

  const ratio = width / height;

  button.style.setProperty("--photo-aspect", ratio.toFixed(4));
  button.classList.toggle("is-portrait", ratio < 0.92);
  button.classList.toggle("is-landscape", ratio > 1.12);
  button.classList.toggle("is-square", ratio >= 0.92 && ratio <= 1.12);
}

function renderCommunityPhotoWall(section) {
  const wall = createElement("div", "community-photo-wall");
  const photos = sortByDateDesc(getActivityPhotos(section));

  if (!photos.length) {
    wall.append(createElement("p", "empty-state", "照片待上传。"));
    return wall;
  }

  photos.forEach((photo) => {
    wall.append(createCommunityPhotoButton(section, photo));
  });

  return wall;
}

function appendMetaRow(list, label, value) {
  const row = document.createElement("div");
  const content = createElement("dd");

  setTextWithBreaks(content, value || "未公开");
  row.append(createInfoLabel(label), content);
  list.append(row);
}

function renderCommunitySectionDetail(container, section) {
  const detail = createElement("section", "community-detail community-section-detail");
  const close = createElement("button", "community-detail-close", "返回");
  const head = createElement("div", "community-detail-head");
  const title = createElement("h3", "", section.name || "活动分区");
  const description = createElement("p");

  close.type = "button";
  close.dataset.communityClose = "";
  setTextWithBreaks(description, section.description || "活动说明整理中。");
  head.append(title, description);
  detail.append(close, head, renderCommunityPhotoWall(section));
  container.append(detail);
}

function renderCommunityPhotoDetail(container, section, photo) {
  const detail = createElement("section", "community-detail community-photo-detail");
  const close = createElement("button", "community-detail-close", "返回");
  const media = createElement("div", "community-photo-media");
  const body = createElement("div", "community-photo-body");
  const label = createElement("p", "item-label", section.name || "社群活动");
  const title = createElement("h3");
  const meta = createElement("dl", "product-params community-photo-meta");

  close.type = "button";
  close.dataset.communityPhotoClose = "";

  if (photo.image && photo.image.src) {
    const image = document.createElement("img");
    image.src = photo.image.src;
    image.alt = photo.image.alt || photo.activity || section.name || "";
    image.loading = "lazy";
    media.append(image);
  } else {
    media.append(createCommunityPlaceholder("图片整理中"));
  }

  setTextWithBreaks(title, photo.activity || section.name || "活动照片");
  appendMetaRow(meta, "日期", formatFixedDate(photo.date) || "未公开");
  appendMetaRow(meta, "活动", photo.activity || "未公开");
  appendMetaRow(meta, "说明", photo.description || "未公开");
  body.append(label, title, meta);
  detail.append(close, media, body);
  container.append(detail);
}

function renderCommunitySections(sections) {
  const communityList = document.querySelector("[data-community-list]");

  if (!communityList) {
    return;
  }

  communitySectionsData = Array.isArray(sections) ? sections : [];
  communityList.textContent = "";

  if (!communitySectionsData.length) {
    activeActivitySectionId = null;
    activeActivityPhotoId = null;
    appendEmptyState(communityList, "社群活动记录整理中。");
    return;
  }

  const activeSection = communitySectionsData.find(
    (section) => section.id === activeActivitySectionId,
  );

  if (!activeSection) {
    activeActivitySectionId = null;
    activeActivityPhotoId = null;
    communityList.classList.remove("is-detail-view");
    renderCommunityOverview(communityList, communitySectionsData);
    return;
  }

  const activePhoto = getActivityPhotos(activeSection).find(
    (photo) => photo.id === activeActivityPhotoId,
  );

  communityList.classList.add("is-detail-view");

  if (activeActivityPhotoId && activePhoto) {
    renderCommunityPhotoDetail(communityList, activeSection, activePhoto);
    return;
  }

  activeActivityPhotoId = null;
  renderCommunitySectionDetail(communityList, activeSection);
}

function renderContact(contact) {
  const qrcodeList = document.querySelector("[data-contact-qrcodes]");
  const methods = document.querySelector("[data-contact-methods]");
  const links = document.querySelector("[data-contact-links]");
  const qrcodes = Array.isArray(contact.qrcodes) ? contact.qrcodes.slice(0, 5) : [];

  if (qrcodeList) {
    qrcodeList.textContent = "";

    if (!qrcodes.length) {
      qrcodeList.append(createElement("p", "empty-state", "二维码信息整理中。"));
    }

    qrcodes.forEach((qrcode) => {
      const item = createElement("article", "contact-qr-item");
      const text = createElement("div", "contact-qr-text");
      const name = createElement("p", "contact-qr-name", qrcode.name || "二维码");
      const noteText = qrcode.image && qrcode.image.alt ? qrcode.image.alt.trim() : "";

      text.append(name);

      if (noteText) {
        text.append(createElement("small", "contact-qr-note", noteText));
      }

      item.append(createQrSlot(qrcode), text);
      qrcodeList.append(item);
    });
  }

  renderNameNumberList(
    methods,
    Array.isArray(contact.methods) ? contact.methods : [],
    "群聊信息整理中。",
  );
  renderNameNumberList(
    links,
    Array.isArray(contact.friendLinks) ? contact.friendLinks : [],
    "友情链接整理中。",
    { linkName: true, emptyValueText: "" },
  );
}

function renderSiteContent(content) {
  const data = window.ContentStore
    ? window.ContentStore.normalizeContent(content)
    : content;
  const club = data.club || {};

  renderBrandName(club.name);
  setTextWithBreaks(document.querySelector("[data-hero-lead]"), club.heroLead);
  renderAbout(club);
  renderExhibitions(data.exhibitions || []);
  renderProducts(data.products || []);
  renderCommunitySections(data.activitySections || []);
  renderContact(club.contact || {});

  const footer = document.querySelector("[data-footer-copyright]");
  if (footer) {
    footer.textContent = club.copyright || "";
  }
}

async function loadSiteContent() {
  if (!window.ContentStore) {
    return;
  }

  if (isAdminPreview) {
    renderSiteContent(window.ContentStore.defaultContent);
    notifyPreviewReady();
    return;
  }

  const { content } = await window.ContentStore.loadContent();
  renderSiteContent(content);
}

window.addEventListener("message", (event) => {
  if (!isAdminPreview || !event.data || event.data.type !== "zdc-preview-content") {
    return;
  }

  renderSiteContent(event.data.content);
});

function notifyPreviewReady() {
  if (isAdminPreview && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "zdc-preview-ready" }, "*");
  }
}

function runExhibitionAnimation(direction) {
  if (!direction || !exhibitionList) {
    return;
  }

  window.clearTimeout(exhibitionAnimationTimer);
  exhibitionList.classList.remove("is-sliding-next", "is-sliding-prev");
  void exhibitionList.offsetWidth;
  exhibitionList.classList.add(`is-sliding-${direction}`);

  exhibitionAnimationTimer = window.setTimeout(() => {
    exhibitionList.classList.remove("is-sliding-next", "is-sliding-prev");
  }, 520);
}

function renderExhibitionPage(direction = null) {
  if (!exhibitionItems.length) {
    return;
  }

  const exhibitionPageSize = getExhibitionPageSize();
  const totalPages = Math.max(
    1,
    Math.ceil(exhibitionItems.length / exhibitionPageSize),
  );

  exhibitionPageIndex = Math.min(
    Math.max(exhibitionPageIndex, 0),
    totalPages - 1,
  );

  const firstVisibleIndex = exhibitionPageIndex * exhibitionPageSize;
  const lastVisibleIndex = firstVisibleIndex + exhibitionPageSize;
  let visibleOrder = 0;

  exhibitionItems.forEach((item, index) => {
    const isVisible = index >= firstVisibleIndex && index < lastVisibleIndex;

    item.hidden = !isVisible;
    item.classList.toggle("is-visible", isVisible);
    item.classList.toggle("has-divider", isVisible && index > firstVisibleIndex);

    if (isVisible) {
      item.style.setProperty("--exhibition-order", visibleOrder);
      visibleOrder += 1;
    } else {
      item.style.removeProperty("--exhibition-order");
    }
  });

  if (exhibitionPrevButton) {
    exhibitionPrevButton.disabled = exhibitionPageIndex === 0;
  }

  if (exhibitionNextButton) {
    exhibitionNextButton.disabled = exhibitionPageIndex === totalPages - 1;
  }

  runExhibitionAnimation(direction);
}

links.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const nextPanel = normalizePanelName(link.dataset.panelLink);

    if (activeProductId) {
      resetProductDetailView();
    }

    if (activeActivitySectionId || activeActivityPhotoId) {
      resetCommunityView();
    }

    history.pushState(null, "", `#${nextPanel}`);
    showPanel(nextPanel, false, true);
  });
});

window.addEventListener("popstate", () => {
  showPanel(location.hash.slice(1), false, true);
});

window.addEventListener("scroll", scheduleReloadStateSave, { passive: true });
window.addEventListener("beforeunload", saveReloadState);
window.addEventListener("pagehide", saveReloadState);

const handleExhibitionBreakpointChange = () => {
  exhibitionPageIndex = 0;
  renderExhibitionPage();
};

if (typeof exhibitionMobileQuery.addEventListener === "function") {
  exhibitionMobileQuery.addEventListener("change", handleExhibitionBreakpointChange);
} else if (typeof exhibitionMobileQuery.addListener === "function") {
  exhibitionMobileQuery.addListener(handleExhibitionBreakpointChange);
}

if (exhibitionPrevButton) {
  exhibitionPrevButton.addEventListener("click", () => {
    if (exhibitionPageIndex === 0) {
      return;
    }

    exhibitionPageIndex -= 1;
    renderExhibitionPage("prev");
  });
}

if (exhibitionNextButton) {
  exhibitionNextButton.addEventListener("click", () => {
    const exhibitionPageSize = getExhibitionPageSize();
    const totalPages = Math.max(
      1,
      Math.ceil(exhibitionItems.length / exhibitionPageSize),
    );

    if (exhibitionPageIndex >= totalPages - 1) {
      return;
    }

    exhibitionPageIndex += 1;
    renderExhibitionPage("next");
  });
}

document.addEventListener("click", (event) => {
  const productFilterToggle = event.target.closest("[data-product-filter-toggle]");

  if (productFilterToggle) {
    setProductFilterMenuOpen(!productFilterMenuOpen);
    return;
  }

  const clearProductFilter = event.target.closest("[data-product-filter-clear]");

  if (clearProductFilter) {
    productFilters.latestOnly = false;
    productFilters.inStockOnly = false;
    productFilters.types.clear();
    productFilterMenuOpen = true;
    renderProducts(productItemsData);
    return;
  }

  const selectButton = event.target.closest("[data-product-select]");

  if (selectButton) {
    activeProductId = selectButton.dataset.productSelect;
    activeProductImageIndex = 0;
    productFilterMenuOpen = false;
    renderProducts(productItemsData);
    return;
  }

  if (productFilterMenuOpen && !event.target.closest(".product-filter")) {
    setProductFilterMenuOpen(false);
    return;
  }

  if (event.target.closest("[data-product-image-prev]")) {
    const product = productItemsData.find((item) => item.id === activeProductId);
    const imageCount = product ? getProductImages(product).length : 0;

    if (imageCount > 1) {
      activeProductImageIndex =
        (activeProductImageIndex - 1 + imageCount) % imageCount;
      renderProducts(productItemsData);
    }

    return;
  }

  if (event.target.closest("[data-product-image-next]")) {
    const product = productItemsData.find((item) => item.id === activeProductId);
    const imageCount = product ? getProductImages(product).length : 0;

    if (imageCount > 1) {
      activeProductImageIndex = (activeProductImageIndex + 1) % imageCount;
      renderProducts(productItemsData);
    }

    return;
  }

  if (event.target.closest("[data-product-close]")) {
    activeProductId = null;
    activeProductImageIndex = 0;
    renderProducts(productItemsData);
    return;
  }

  const sectionButton = event.target.closest("[data-community-section-select]");

  if (sectionButton) {
    activeActivitySectionId = sectionButton.dataset.communitySectionSelect;
    activeActivityPhotoId = null;
    renderCommunitySections(communitySectionsData);
    return;
  }

  const photoButton = event.target.closest("[data-community-photo-select]");

  if (photoButton) {
    activeActivityPhotoId = photoButton.dataset.communityPhotoSelect;
    renderCommunitySections(communitySectionsData);
    return;
  }

  if (event.target.closest("[data-community-photo-close]")) {
    activeActivityPhotoId = null;
    renderCommunitySections(communitySectionsData);
    return;
  }

  if (event.target.closest("[data-community-close]")) {
    activeActivitySectionId = null;
    activeActivityPhotoId = null;
    renderCommunitySections(communitySectionsData);
  }
});

document.addEventListener("change", (event) => {
  const latestFilter = event.target.closest("[data-product-filter-latest]");
  const stockFilter = event.target.closest("[data-product-filter-stock]");
  const typeFilter = event.target.closest("[data-product-filter-type]");

  if (latestFilter) {
    productFilters.latestOnly = latestFilter.checked;
    productFilterMenuOpen = true;
    renderProducts(productItemsData);
    return;
  }

  if (stockFilter) {
    productFilters.inStockOnly = stockFilter.checked;
    productFilterMenuOpen = true;
    renderProducts(productItemsData);
    return;
  }

  if (typeFilter) {
    const type = typeFilter.value;

    if (typeFilter.checked) {
      productFilters.types.add(type);
    } else {
      productFilters.types.delete(type);
    }

    productFilterMenuOpen = true;
    renderProducts(productItemsData);
  }
});

const savedReloadState = getSavedReloadState();

applySavedViewState(savedReloadState);
exhibitionItems = Array.from(document.querySelectorAll("[data-exhibition-item]"));
renderExhibitionPage();
showPanel(savedReloadState ? savedReloadState.panel : location.hash.slice(1));
loadSiteContent().then(() => {
  restoreSavedScroll(savedReloadState);
});
