const panelNames = ["home", "about", "products", "moments", "creative", "contact"];
const links = document.querySelectorAll("[data-panel-link]");
const panels = document.querySelectorAll("[data-panel]");
const scriptToggle = document.querySelector("[data-script-toggle]");
const hideTimers = new WeakMap();
const homeDigest = document.querySelector("[data-home-digest]");
const homeDigestTabs = document.querySelectorAll("[data-home-digest-tab]");
const homeDigestPanels = document.querySelectorAll("[data-home-digest-panel]");
const exhibitionList = document.querySelector("[data-exhibition-list]");
const exhibitionPrevButton = document.querySelector("[data-exhibition-prev]");
const exhibitionNextButton = document.querySelector("[data-exhibition-next]");
const homeCallBlock = document.querySelector("[data-home-call-block]");
const callSummaryList = document.querySelector("[data-call-summary-list]");
const callPrevButton = document.querySelector("[data-call-prev]");
const callNextButton = document.querySelector("[data-call-next]");
const exhibitionMobileQuery = window.matchMedia("(max-width: 560px)");
const communityTabletQuery = window.matchMedia("(max-width: 980px)");
const communityMobileQuery = window.matchMedia("(max-width: 560px)");
const contactSingleColumnQuery = window.matchMedia("(max-width: 860px)");
const exhibitionDesktopPageSize = 3;
const callSummaryPageSize = 2;
const homeDigestAutoDelayMs = 6200;
const isAdminPreview = new URLSearchParams(window.location.search).get("preview") === "admin";
const manuscriptReaderId = new URLSearchParams(window.location.search).get("manuscript") || "";
let exhibitionItems = [];
let exhibitionPageIndex = 0;
let exhibitionAnimationTimer;
let callSummaryItems = [];
let callSummaryPageIndex = 0;
let callSummaryAnimationTimer;
let activeHomeDigest = "exhibitions";
let homeDigestAutoTimer = null;
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
let creativeCallsData = [];
let manuscriptsData = [];
let activeCreativeCallId = null;
const reloadStateKey = "zdc-reload-view-state";
const textScriptStorageKey = "zdc-text-script";
const panelTransitionMs = 430;
let reloadStateSaveFrame = null;
let contactSpacingFrame = null;
let activePanelName = "home";
let currentSiteContent = null;
let currentSiteData = null;
let currentTextScript = getSavedTextScript();
let optimizedMediaNames = null;
let optimizedMediaManifestPromise = null;
let productPanelRendered = false;
let communityPanelRendered = false;
let creativePanelRendered = false;
let contentPanelRenderToken = 0;
const communityPhotoLayoutFrames = new WeakMap();
let communityPhotoWallObserver = null;
let productOverviewScrollY = 0;
let communityOverviewScrollY = 0;
let communitySectionScrollY = 0;
let creativeOverviewScrollY = 0;

function getOptimizedMediaSrc(src) {
  const raw = String(src || "").trim();

  if (!raw || raw.startsWith("data:") || /^(https?:|blob:)/i.test(raw)) {
    return raw;
  }

  const path = raw.split("?")[0].split("#")[0].replace(/^\.\//, "");

  if (!path.startsWith("data/media/") || path.startsWith("data/media/optimized/")) {
    return raw;
  }

  const fileName = path.slice("data/media/".length);

  if (!fileName || fileName.includes("/") || !/\.(jpe?g|png|webp)$/i.test(fileName)) {
    return raw;
  }

  const optimizedName = fileName.replace(/\.[^.]+$/, ".webp");

  if (!optimizedMediaNames || !optimizedMediaNames.has(optimizedName)) {
    return raw;
  }

  return `data/media/optimized/thumb/${optimizedName}`;
}

async function loadOptimizedMediaManifest() {
  if (optimizedMediaNames) {
    return;
  }

  optimizedMediaNames = new Set();

  try {
    const response = await fetch("data/media/optimized/thumb-manifest.json", {
      cache: "no-cache",
    });

    if (!response.ok) {
      return;
    }

    const manifest = await response.json();
    const images = Array.isArray(manifest.images) ? manifest.images : [];

    optimizedMediaNames = new Set(
      images.filter((name) => /^[^/\\]+\.webp$/i.test(String(name || ""))),
    );
  } catch (error) {
    optimizedMediaNames = new Set();
  }
}

function ensureOptimizedMediaManifest() {
  if (!optimizedMediaManifestPromise) {
    optimizedMediaManifestPromise = loadOptimizedMediaManifest();
  }

  return optimizedMediaManifestPromise;
}

function setImageSource(image, src, options = {}) {
  const originalSrc = String(src || "").trim();
  const optimizedSrc = getOptimizedMediaSrc(originalSrc);
  const preferredSrc = options.preferOriginal ? originalSrc : optimizedSrc;

  image.decoding = "async";

  if (options.loading !== false) {
    image.loading = options.loading || "lazy";
  }

  if (options.fetchPriority) {
    image.setAttribute("fetchpriority", options.fetchPriority);
  }

  if (options.progressiveOriginal && optimizedSrc && optimizedSrc !== originalSrc) {
    const fullImage = new Image();

    image.src = optimizedSrc;
    fullImage.decoding = "async";
    fullImage.addEventListener(
      "load",
      () => {
        image.src = originalSrc;
      },
      { once: true },
    );
    fullImage.src = originalSrc;

    return optimizedSrc;
  }

  if (options.preferOriginal && optimizedSrc && optimizedSrc !== originalSrc) {
    image.addEventListener(
      "error",
      () => {
        image.src = optimizedSrc;
      },
      { once: true },
    );
  } else if (preferredSrc && preferredSrc !== originalSrc) {
    image.addEventListener(
      "error",
      () => {
        image.src = originalSrc;
      },
      { once: true },
    );
  }

  image.src = preferredSrc || originalSrc;
  return preferredSrc || originalSrc;
}

const traditionalPhraseMap = [
  ["子种大川", "子種大川"],
  ["二维码", "QR Code"],
  ["友情链接", "友站連結"],
  ["相关群聊", "相關群組"],
  ["网站维护联系邮箱", "網站維護聯絡電郵"],
  ["回复网站相关问题", "回覆網站相關問題"],
  ["社团制品", "社團出品"],
  ["社群活动", "社群活動"],
  ["关于社团", "關於社團"],
  ["联系我们", "聯絡我們"],
  ["联系方式", "聯絡方式"],
  ["联系", "聯絡"],
  ["近期参展", "近期參展"],
  ["创作征集", "創作徵集"],
  ["正在征集", "正在徵集"],
  ["稿件阅览", "稿件閱覽"],
  ["征集名称", "徵集名稱"],
  ["征集详情", "徵集詳情"],
  ["征集中", "徵集中"],
  ["已截稿", "已截稿"],
  ["截止日期", "截止日期"],
  ["截止日期未定", "截止日期未定"],
  ["投稿方向", "投稿方向"],
  ["参与方式", "參與方式"],
  ["简短说明", "簡短說明"],
  ["关联征稿", "關聯徵稿"],
  ["散件来稿", "散件來稿"],
  ["稿件标题", "稿件標題"],
  ["稿件正文", "稿件正文"],
  ["稿件暂未陈列", "稿件暫未陳列"],
  ["来稿暂未陈列，欢迎通过“联系我们”向我们投递作品。", "稿件暫未陳列，歡迎透過「聯絡我們」向我們投遞作品。"],
  ["来源", "來源"],
  ["作者", "作者"],
  ["类型", "類型"],
  ["附件", "附件"],
  ["文字", "文字"],
  ["画作", "畫作"],
  ["摄影", "攝影"],
  ["其他", "其他"],
  ["综合", "綜合"],
  ["备注", "備註"],
  ["部分试阅", "部分試閱"],
  ["全书阅览", "全書閱覽"],
  ["通贩链接", "通販連結"],
  ["通贩", "通販"],
  ["展示类别", "展示類別"],
  ["发布日期", "發佈日期"],
  ["制品交流宣发", "出品交流宣傳"],
  ["制品资料", "出品資料"],
  ["制品简介", "出品簡介"],
  ["制品图片", "出品圖片"],
  ["未命名制品", "未命名出品"],
  ["最新制品", "最新出品"],
  ["筛选条件", "篩選條件"],
  ["清除筛选", "清除篩選"],
  ["活动分区", "活動分區"],
  ["活动照片", "活動相片"],
  ["活动说明", "活動說明"],
  ["照片整理", "相片整理"],
  ["照片待上传", "相片待上載"],
  ["图片待上传", "圖片待上載"],
  ["图片整理", "圖片整理"],
  ["信息整理", "資料整理"],
  ["社团信息", "社團資料"],
  ["社团资料", "社團資料"],
  ["地点未公开", "地點未公開"],
  ["日期未公开", "日期未公開"],
  ["价格未公开", "價錢未公開"],
  ["使用桌面浏览器以获取最佳浏览效果", "使用桌面瀏覽器以取得最佳瀏覽效果"],
  ["本页涉及肖像展示的内容，均已取得相关当事人授权。", "本頁涉及肖像展示的內容，均已取得相關當事人授權。"],
  ["准创作者", "準創作者"],
  ["东方Project", "東方Project"],
  ["东方同人", "東方同人"],
  ["四川大学", "四川大學"],
  ["术力口", "VOCALOID"],
  ["同人文集", "同人文集"],
  ["合同志", "合同志"],
  ["微合同志", "微合同志"],
  ["书刊", "書刊"],
  ["手作", "手作"],
  ["后台", "後台"],
  ["游客群", "訪客群組"],
  ["投稿群", "投稿群組"],
  ["进群", "入群"],
  ["上传", "上載"],
  ["发布", "發佈"],
  ["价格", "價錢"],
  ["照片", "相片"],
  ["制品", "出品"],
  ["舞台", "舞台"],
  ["台湾", "台灣"],
  ["游记", "遊記"],
  ["旅游", "旅遊"],
  ["完售", "完售"],
];

const traditionalCharMap = {
  "万": "萬",
  "与": "與",
  "东": "東",
  "丝": "絲",
  "个": "個",
  "丰": "豐",
  "临": "臨",
  "为": "為",
  "义": "義",
  "乐": "樂",
  "习": "習",
  "乡": "鄉",
  "书": "書",
  "云": "雲",
  "于": "於",
  "仅": "僅",
  "兰": "蘭",
  "从": "從",
  "们": "們",
  "价": "價",
  "会": "會",
  "传": "傳",
  "体": "體",
  "关": "關",
  "养": "養",
  "写": "寫",
  "准": "準",
  "划": "劃",
  "创": "創",
  "别": "別",
  "制": "製",
  "办": "辦",
  "动": "動",
  "劲": "勁",
  "区": "區",
  "华": "華",
  "协": "協",
  "单": "單",
  "却": "卻",
  "历": "歷",
  "参": "參",
  "叆": "靉",
  "叇": "靆",
  "双": "雙",
  "发": "發",
  "变": "變",
  "号": "號",
  "后": "後",
  "团": "團",
  "国": "國",
  "图": "圖",
  "场": "場",
  "坛": "壇",
  "声": "聲",
  "壶": "壺",
  "复": "復",
  "夺": "奪",
  "学": "學",
  "宁": "寧",
  "实": "實",
  "宽": "寬",
  "对": "對",
  "将": "將",
  "尘": "塵",
  "尝": "嘗",
  "属": "屬",
  "岁": "歲",
  "师": "師",
  "帜": "幟",
  "带": "帶",
  "并": "並",
  "广": "廣",
  "庆": "慶",
  "库": "庫",
  "开": "開",
  "异": "異",
  "张": "張",
  "当": "當",
  "录": "錄",
  "态": "態",
  "愿": "願",
  "恋": "戀",
  "战": "戰",
  "报": "報",
  "挂": "掛",
  "携": "攜",
  "摊": "攤",
  "数": "數",
  "无": "無",
  "旧": "舊",
  "时": "時",
  "机": "機",
  "权": "權",
  "术": "術",
  "条": "條",
  "来": "來",
  "栏": "欄",
  "档": "檔",
  "梦": "夢",
  "樱": "櫻",
  "欢": "歡",
  "毕": "畢",
  "汇": "匯",
  "汤": "湯",
  "没": "沒",
  "泽": "澤",
  "浏": "瀏",
  "滨": "濱",
  "灵": "靈",
  "灿": "燦",
  "点": "點",
  "烁": "爍",
  "烂": "爛",
  "爱": "愛",
  "状": "狀",
  "猫": "貓",
  "环": "環",
  "现": "現",
  "电": "電",
  "着": "著",
  "码": "碼",
  "离": "離",
  "种": "種",
  "称": "稱",
  "筛": "篩",
  "简": "簡",
  "类": "類",
  "红": "紅",
  "约": "約",
  "纯": "純",
  "纸": "紙",
  "线": "線",
  "组": "組",
  "织": "織",
  "绕": "繞",
  "给": "給",
  "续": "續",
  "维": "維",
  "绵": "綿",
  "编": "編",
  "网": "網",
  "联": "聯",
  "胶": "膠",
  "节": "節",
  "获": "獲",
  "虽": "雖",
  "装": "裝",
  "见": "見",
  "规": "規",
  "览": "覽",
  "计": "計",
  "认": "認",
  "议": "議",
  "记": "記",
  "论": "論",
  "设": "設",
  "访": "訪",
  "证": "證",
  "评": "評",
  "识": "識",
  "试": "試",
  "详": "詳",
  "说": "說",
  "请": "請",
  "诸": "諸",
  "读": "讀",
  "调": "調",
  "账": "賬",
  "货": "貨",
  "质": "質",
  "贰": "貳",
  "费": "費",
  "资": "資",
  "跃": "躍",
  "践": "踐",
  "跹": "躚",
  "车": "車",
  "转": "轉",
  "载": "載",
  "辑": "輯",
  "边": "邊",
  "迈": "邁",
  "进": "進",
  "连": "連",
  "选": "選",
  "钢": "鋼",
  "铃": "鈴",
  "链": "鏈",
  "锁": "鎖",
  "锦": "錦",
  "长": "長",
  "门": "門",
  "闪": "閃",
  "间": "間",
  "阅": "閱",
  "队": "隊",
  "阳": "陽",
  "页": "頁",
  "项": "項",
  "颗": "顆",
  "题": "題",
  "风": "風",
  "饭": "飯",
  "饲": "飼",
  "馆": "館",
  "验": "驗",
  "鸟": "鳥",
  "鸽": "鴿",
  "龙": "龍",
  "里": "裡",
};

function getSavedTextScript() {
  try {
    return localStorage.getItem(textScriptStorageKey) === "traditional"
      ? "traditional"
      : "simplified";
  } catch (error) {
    return "simplified";
  }
}

function toTraditionalText(value) {
  let result = String(value ?? "");

  traditionalPhraseMap.forEach(([from, to]) => {
    result = result.split(from).join(to);
  });

  return Array.from(result)
    .map((char) => traditionalCharMap[char] || char)
    .join("");
}

function getDisplayText(value) {
  const text = String(value ?? "");

  return currentTextScript === "traditional" ? toTraditionalText(text) : text;
}

function setDisplayText(element, value) {
  if (element) {
    element.textContent = getDisplayText(value);
  }
}

function setDisplayAttribute(element, name, value) {
  if (element) {
    element.setAttribute(name, getDisplayText(value));
  }
}

function updateScriptToggle() {
  if (!scriptToggle) {
    return;
  }

  const isTraditional = currentTextScript === "traditional";

  scriptToggle.textContent = isTraditional ? "简" : "繁";
  scriptToggle.setAttribute("aria-label", isTraditional ? "切换为简体" : "切换为繁体");
  scriptToggle.setAttribute("aria-pressed", String(isTraditional));
}

function setStaticText(selector, text) {
  setDisplayText(document.querySelector(selector), text);
}

function updateStaticTextScript() {
  const isTraditional = currentTextScript === "traditional";
  const root = document.documentElement;

  root.lang = isTraditional ? "zh-Hant" : "zh-CN";
  root.dataset.textScript = currentTextScript;
  document.body.dataset.textScript = currentTextScript;
  document.title = getDisplayText("子种大川");

  const description =
    "子种大川是由四川大学学生发起建立的民间东方同人社团，致力于为曾迸发创作火花、却尚未付诸实践的准创作者们，提供迈出第一步的舞台。";
  const shortDescription =
    "由四川大学学生发起建立的民间东方同人社团，致力于为准创作者们提供迈出第一步的舞台。";

  document.querySelector('meta[name="description"]')?.setAttribute(
    "content",
    getDisplayText(description),
  );
  document.querySelector('meta[property="og:title"]')?.setAttribute(
    "content",
    getDisplayText("子种大川"),
  );
  document.querySelector('meta[property="og:description"]')?.setAttribute(
    "content",
    getDisplayText(shortDescription),
  );
  document.querySelector('meta[name="twitter:title"]')?.setAttribute(
    "content",
    getDisplayText("子种大川"),
  );
  document.querySelector('meta[name="twitter:description"]')?.setAttribute(
    "content",
    getDisplayText(shortDescription),
  );

  setDisplayText(document.querySelector('.site-nav [data-panel-link="home"]'), "首页");
  setDisplayText(document.querySelector('.site-nav [data-panel-link="about"]'), "关于社团");
  setDisplayText(document.querySelector('.site-nav [data-panel-link="products"]'), "社团制品");
  setDisplayText(document.querySelector('.site-nav [data-panel-link="moments"]'), "社群活动");
  setDisplayText(document.querySelector('.site-nav [data-panel-link="creative"]'), "创作征集");
  setDisplayText(document.querySelector('.site-nav [data-panel-link="contact"]'), "联系我们");
  setDisplayAttribute(document.querySelector(".brand"), "aria-label", "回到首页，子种大川");
  setDisplayAttribute(document.querySelector(".site-nav"), "aria-label", "页面栏目");
  setDisplayText(document.querySelector(".brand-char-1"), "子");
  setDisplayText(document.querySelector(".brand-char-2"), "种");
  setDisplayText(document.querySelector(".brand-char-3"), "大");
  setDisplayText(document.querySelector(".brand-char-4"), "川");
  setStaticText('[data-panel="about"] .section-title h2', "关于社团");
  setStaticText('[data-panel="products"] .section-title h2', "社团制品");
  setStaticText('[data-panel="moments"] .section-title h2', "社群活动");
  setStaticText('[data-panel="creative"] .section-title h2', "创作征集");
  setStaticText('[data-panel="contact"] .section-title h2', "联系我们");
  setStaticText('[data-home-digest-tab="exhibitions"]', "近期参展");
  setStaticText('[data-home-digest-tab="calls"]', "正在征集");
  setStaticText(".hero-browser-note", "使用桌面浏览器以获取最佳浏览效果");
  setStaticText(
    ".community-portrait-note",
    "本页涉及肖像展示的内容，均已取得相关当事人授权。",
  );
  setStaticText(".contact-methods-block h3", "相关群聊");
  setStaticText(".contact-links-block h3", "友情链接");
  setStaticText(".contact-maintenance h3", "网站维护联系邮箱");
  setStaticText(".contact-maintenance-note", "回复网站相关问题");
  setDisplayAttribute(exhibitionPrevButton, "aria-label", "上一页");
  setDisplayAttribute(exhibitionNextButton, "aria-label", "下一页");
  setDisplayAttribute(callPrevButton, "aria-label", "上一页");
  setDisplayAttribute(callNextButton, "aria-label", "下一页");
  updateScriptToggle();
}

function setTextScript(nextScript) {
  currentTextScript = nextScript === "traditional" ? "traditional" : "simplified";

  try {
    localStorage.setItem(textScriptStorageKey, currentTextScript);
  } catch (error) {
    // 忽略无法保存语言偏好的浏览器环境。
  }

  updateStaticTextScript();

  if (currentSiteContent) {
    renderSiteContent(currentSiteContent);
  }
}

function resetProductDetailView(shouldRender = true) {
  if (!activeProductId) {
    return;
  }

  activeProductId = null;
  activeProductImageIndex = 0;

  if (shouldRender && activePanelName === "products" && productItemsData.length) {
    renderProducts(productItemsData);
    productPanelRendered = true;
  } else {
    productPanelRendered = false;
  }
}

function resetCommunityView(shouldRender = true) {
  if (!activeActivitySectionId && !activeActivityPhotoId) {
    return;
  }

  activeActivitySectionId = null;
  activeActivityPhotoId = null;

  if (shouldRender && activePanelName === "moments" && communitySectionsData.length) {
    renderCommunitySections(communitySectionsData);
    communityPanelRendered = true;
  } else {
    communityPanelRendered = false;
  }
}

function resetCreativeView(shouldRender = true) {
  if (!activeCreativeCallId) {
    return;
  }

  activeCreativeCallId = null;

  if (shouldRender && activePanelName === "creative") {
    renderCreativeSection(creativeCallsData, manuscriptsData);
    creativePanelRendered = true;
  } else {
    creativePanelRendered = false;
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
    activeCreativeCallId,
    productOverviewScrollY,
    communityOverviewScrollY,
    communitySectionScrollY,
    creativeOverviewScrollY,
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
  activeCreativeCallId = state.activeCreativeCallId || null;
  productOverviewScrollY = Number(state.productOverviewScrollY) || 0;
  communityOverviewScrollY = Number(state.communityOverviewScrollY) || 0;
  communitySectionScrollY = Number(state.communitySectionScrollY) || 0;
  creativeOverviewScrollY = Number(state.creativeOverviewScrollY) || 0;
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

function schedulePanelStartScroll() {
  requestAnimationFrame(scrollToPanelStart);
  window.setTimeout(scrollToPanelStart, 80);
}

function restoreContentScroll(scrollY, shouldRestore = () => true) {
  if (!Number.isFinite(Number(scrollY))) {
    return;
  }

  const scrollTop = Math.max(0, Number(scrollY));
  const restore = () => {
    if (!shouldRestore()) {
      return;
    }

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

  if (nextPanel === "contact") {
    requestAnimationFrame(scheduleContactMethodSpacing);
    window.setTimeout(scheduleContactMethodSpacing, panelTransitionMs + 40);
  }

  if (nextPanel === "home") {
    scheduleHomeDigestAutoPage();
  } else {
    stopHomeDigestAutoPage();
  }

  renderActiveContentPanel();
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (typeof text === "string") {
    element.textContent = getDisplayText(text);
  }

  return element;
}

function setTextWithBreaks(element, value) {
  if (!element) {
    return;
  }

  element.textContent = "";
  getDisplayText(value || "")
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
  const label = getDisplayText(text || "项目").replace(/\s+/g, " ").trim() || getDisplayText("项目");
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

function sortByDeadlineAsc(items) {
  return items
    .map((item, index) => {
      const parts = getDateParts(item.deadline);

      return {
        ...item,
        originalIndex: index,
        sortTime: parts ? parts.time : Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => a.sortTime - b.sortTime || a.originalIndex - b.originalIndex);
}

function getOpenCreativeCalls(calls) {
  return sortByDeadlineAsc(
    (Array.isArray(calls) ? calls : []).filter((call) => call.status === "征集中"),
  );
}

function getCreativeDirection(call) {
  const direction = call.direction || "综合";

  if (direction === "其他" && call.directionOther) {
    return call.directionOther;
  }

  return direction;
}

function getCreativeDeadlineText(call) {
  return formatFixedDate(call.deadline) || "截止日期未定";
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

function getProductShopHref(product) {
  return getExternalHref(
    product.shopLink ||
      product.shopUrl ||
      product.purchaseUrl ||
      product.storeUrl ||
      product.boothLink ||
      "",
  );
}

function createProductActionLinks(product) {
  const documents = product.documents || {};
  const sample = normalizeProductDocument(documents.sample);
  const full = normalizeProductDocument(documents.full);
  const shopHref = getProductShopHref(product);
  const actions = [];

  if (sample.src) {
    actions.push({
      href: sample.src,
      label: "部分试阅",
      fileName: sample.name || `${product.name || "制品"}-部分试阅.pdf`,
      type: "document",
    });
  }

  if (supportsFullBookDocument(product) && full.src) {
    actions.push({
      href: full.src,
      label: "全书阅览",
      fileName: full.name || `${product.name || "制品"}-全书阅览.pdf`,
      type: "document",
    });
  }

  if (shopHref) {
    actions.push({
      href: shopHref,
      label: "通贩",
      type: "shop",
    });
  }

  if (!actions.length) {
    return null;
  }

  const wrapper = createElement("div", "product-actions");

  actions.forEach((item) => {
    const link = createElement(
      "a",
      `product-action-link product-action-link-${item.type}`,
      item.label,
    );

    link.href = item.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (item.fileName) {
      link.download = item.fileName;
      link.dataset.documentSource = item.href;
    }
    setDisplayAttribute(link, "aria-label", `${product.name || "制品"}${item.label}`);
    wrapper.append(link);
  });

  return wrapper;
}

function createImageSlot(product, imageOverride = null, variant = "thumbnail", options = {}) {
  const slot = createElement("span", `image-slot image-slot-${variant}`);
  const image = imageOverride || getProductImages(product)[0] || product.image || {};

  if (image.src) {
    if (variant === "thumbnail") {
      const background = document.createElement("img");
      background.className = "image-slot-bg";
      background.alt = "";
      background.setAttribute("aria-hidden", "true");
      setImageSource(background, image.src, { loading: "lazy" });
      slot.append(background);
    }

    const img = document.createElement("img");
    img.className = "image-slot-main";
    img.alt = image.alt || product.name || "";
    setImageSource(img, image.src, {
      preferOriginal: variant === "detail",
      progressiveOriginal: variant === "detail",
      loading: options.loading || (variant === "detail" ? "eager" : "lazy"),
      fetchPriority: options.fetchPriority,
    });
    slot.append(img);
  } else {
    setDisplayAttribute(slot, "aria-label", "制品图片");
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
    setDisplayAttribute(prev, "aria-label", "上一张制品图片");
    next.type = "button";
    next.dataset.productImageNext = "";
    setDisplayAttribute(next, "aria-label", "下一张制品图片");
    controls.append(prev, next);
    carousel.append(controls);
  }

  return carousel;
}

function createQrSlot(qrcode) {
  const href = getExternalHref(qrcode.url || qrcode.href || qrcode.link);
  const slot = href ? document.createElement("a") : createElement("span", "qr-slot");
  const image = qrcode.image || {};

  if (href) {
    slot.className = "qr-slot qr-slot-link";
    slot.href = href;
    slot.target = "_blank";
    slot.rel = "noreferrer";
    setDisplayAttribute(slot, "aria-label", `${qrcode.name || "二维码"}链接`);
  }

  if (image.src) {
    const img = document.createElement("img");
    img.alt = image.alt || qrcode.name || "二维码";
    setImageSource(img, image.src, { preferOriginal: true });
    slot.append(img);
  } else {
    setDisplayAttribute(slot, "aria-label", "二维码");
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

function getMailtoHref(value) {
  const raw = String(value || "").trim().replace(/^mailto:/i, "");

  if (!raw || /\s/.test(raw) || !/^[^@]+@[^@]+\.[^@]+$/.test(raw)) {
    return "";
  }

  return `mailto:${raw}`;
}

function createExternalLink(href, text) {
  const link = document.createElement("a");

  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = getDisplayText(text);

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
      setDisplayText(name, nameText);
    }

    const valueHref = getExternalHref(value);

    if (valueHref) {
      number.append(createExternalLink(valueHref, value));
    } else {
      setDisplayText(number, value);
    }

    row.append(name, number);
    container.append(row);
  });
}

function clearContactMethodSpacing() {
  const methodsBlock = document.querySelector(".contact-methods-block");

  if (!methodsBlock) {
    return;
  }

  methodsBlock.style.removeProperty("--contact-title-gap");
  methodsBlock.style.removeProperty("--contact-content-gap");
}

function updateContactMethodSpacing() {
  contactSpacingFrame = null;

  const contactSide = document.querySelector(".contact-side");
  const methodsBlock = document.querySelector(".contact-methods-block");
  const title = methodsBlock?.querySelector("h3");
  const rows = Array.from(methodsBlock?.querySelectorAll(".contact-line") || []);

  clearContactMethodSpacing();

  if (
    !contactSide ||
    !methodsBlock ||
    !title ||
    !contactSide.classList.contains("has-maintenance") ||
    contactSingleColumnQuery.matches ||
    rows.length < 1
  ) {
    return;
  }

  const blockHeight = methodsBlock.getBoundingClientRect().height;
  const titleHeight = title.getBoundingClientRect().height;
  const rowsHeight = rows.reduce(
    (sum, row) => sum + row.getBoundingClientRect().height,
    0,
  );
  const availableGap = Math.max(0, blockHeight - titleHeight - rowsHeight);
  const titleWeight = 14;
  const contentWeight = 10;
  const totalWeight = titleWeight + Math.max(0, rows.length - 1) * contentWeight;

  if (!availableGap || !totalWeight) {
    return;
  }

  methodsBlock.style.setProperty(
    "--contact-title-gap",
    `${(availableGap * titleWeight) / totalWeight}px`,
  );
  methodsBlock.style.setProperty(
    "--contact-content-gap",
    `${(availableGap * contentWeight) / totalWeight}px`,
  );
}

function scheduleContactMethodSpacing() {
  if (contactSpacingFrame !== null) {
    cancelAnimationFrame(contactSpacingFrame);
  }

  contactSpacingFrame = requestAnimationFrame(updateContactMethodSpacing);
}

function renderBrandName(name) {
  const heading = document.querySelector("[data-club-name]");
  const brand = document.querySelector(".brand");
  const brandTitle = document.querySelector(".brand-title");

  if (heading) {
    setDisplayText(heading, name || "子种大川");
  }

  if (brand) {
    setDisplayAttribute(brand, "aria-label", `回到首页，${name || "子种大川"}`);
  }

  if (!brandTitle || !name) {
    return;
  }

  const chars = Array.from(name).slice(0, 4);
  const charNodes = brandTitle.querySelectorAll(".brand-char");

  charNodes.forEach((node, index) => {
    setDisplayText(node, chars[index] || "");
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
    exhibitionList.classList.remove(
      "is-balanced",
      "exhibition-visible-1",
      "exhibition-visible-2",
    );
    exhibitionList.append(createElement("p", "empty-state", "近期参展信息整理中。"));

    if (exhibitionPrevButton) {
      exhibitionPrevButton.disabled = true;
    }

    if (exhibitionNextButton) {
      exhibitionNextButton.disabled = true;
    }

    updateHomeDigestState();
    scheduleHomeDigestAutoPage();
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
  updateHomeDigestState();
  scheduleHomeDigestAutoPage();
}

function renderHomeCreativeCalls(calls) {
  if (!callSummaryList || !homeCallBlock) {
    return;
  }

  callSummaryList.textContent = "";
  callSummaryItems = [];
  callSummaryPageIndex = 0;

  const openCalls = getOpenCreativeCalls(calls);

  if (!openCalls.length) {
    homeCallBlock.hidden = true;
    if (callPrevButton) {
      callPrevButton.disabled = true;
    }

    if (callNextButton) {
      callNextButton.disabled = true;
    }

    updateHomeDigestState("exhibitions");
    scheduleHomeDigestAutoPage();
    return;
  }

  openCalls.forEach((call) => {
    const button = createElement("button", "exhibition-item call-summary-item");
    const main = createElement("span", "exhibition-main");
    const title = createElement("span", "call-summary-title", call.name || "未命名征集");
    const detail = createElement("span", "exhibition-detail");
    const note = createElement("small", "exhibition-note", call.summary || "");

    button.type = "button";
    button.dataset.callSummaryItem = "";
    button.dataset.creativeCallSelect = call.id;
    setDisplayAttribute(button, "aria-label", `查看${call.name || "征集"}详情`);
    detail.append(
      createElement("span", "exhibition-date", getCreativeDeadlineText(call)),
    );
    main.append(title, detail);
    button.append(main, note);
    callSummaryList.append(button);
  });

  callSummaryItems = Array.from(callSummaryList.querySelectorAll("[data-call-summary-item]"));
  renderCallSummaryPage();
  updateHomeDigestState();
  scheduleHomeDigestAutoPage();
}

function normalizeHomeDigestName(name) {
  return name === "calls" ? "calls" : "exhibitions";
}

function getCallSummaryPageSize() {
  return callSummaryPageSize;
}

function getHomeDigestPageSize(name = activeHomeDigest) {
  return normalizeHomeDigestName(name) === "calls"
    ? getCallSummaryPageSize()
    : getExhibitionPageSize();
}

function getHomeDigestItems(name = activeHomeDigest) {
  return normalizeHomeDigestName(name) === "calls"
    ? callSummaryItems
    : exhibitionItems;
}

function getHomeDigestPageIndex(name = activeHomeDigest) {
  return normalizeHomeDigestName(name) === "calls"
    ? callSummaryPageIndex
    : exhibitionPageIndex;
}

function setHomeDigestPageIndex(name, index) {
  if (normalizeHomeDigestName(name) === "calls") {
    callSummaryPageIndex = index;
    return;
  }

  exhibitionPageIndex = index;
}

function getHomeDigestTotalPages(name = activeHomeDigest) {
  const items = getHomeDigestItems(name);
  const pageSize = getHomeDigestPageSize(name);

  return Math.max(1, Math.ceil(items.length / pageSize));
}

function updateHomeDigestState(nextDigest = activeHomeDigest) {
  if (!homeDigest) {
    return;
  }

  const hasCalls = callSummaryItems.length > 0;
  activeHomeDigest = hasCalls ? normalizeHomeDigestName(nextDigest) : "exhibitions";
  homeDigest.dataset.activeDigest = activeHomeDigest;
  homeDigest.classList.toggle("has-call-digest", hasCalls);
  homeDigest.classList.toggle("has-single-digest", !hasCalls);

  homeDigestTabs.forEach((tab) => {
    const digest = normalizeHomeDigestName(tab.dataset.homeDigestTab);
    const isCallTab = digest === "calls";
    const isActive = digest === activeHomeDigest;

    tab.hidden = isCallTab && !hasCalls;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  homeDigestPanels.forEach((panel) => {
    const digest = normalizeHomeDigestName(panel.dataset.homeDigestPanel);
    const isActive = digest === activeHomeDigest;

    panel.hidden = digest === "calls" ? !hasCalls || !isActive : !isActive;
    panel.classList.toggle("is-active", isActive);
  });
}

function createCreativeSubTitle(text) {
  const title = createElement("h3", "creative-subtitle", text);

  return title;
}

function renderCreativeCallCard(call) {
  const button = createElement("button", "creative-call-card");
  const title = createElement("h4", "", call.name || "未命名征集");
  const meta = createElement("div", "creative-card-meta");
  const summary = createElement("p", "creative-card-summary");

  button.type = "button";
  button.dataset.creativeCallSelect = call.id;
  setDisplayAttribute(button, "aria-label", `查看${call.name || "征集"}详情`);

  meta.append(
    createElement("span", "creative-status", call.status || "征集中"),
    createElement("span", "", getCreativeDeadlineText(call)),
    createElement("span", "", getCreativeDirection(call)),
  );
  setTextWithBreaks(summary, call.summary || "简短说明整理中。");
  button.append(title, meta, summary);
  return button;
}

function getCreativeCallName(callId) {
  const call = creativeCallsData.find((item) => item.id === callId);

  return call?.name || "";
}

function getManuscriptSource(manuscript) {
  return getCreativeCallName(manuscript.callId) || "散件来稿";
}

function renderManuscriptRow(manuscript) {
  const button = createElement("button", "manuscript-row");
  const main = createElement("span", "manuscript-main");
  const title = createElement("span", "manuscript-title", manuscript.title || "未命名稿件");
  const desc = createElement("span", "manuscript-desc");
  const meta = [
    manuscript.author || "作者未公开",
    manuscript.type || "类型未公开",
    formatFixedDate(manuscript.publishDate) || "日期未公开",
    `来源：${getManuscriptSource(manuscript)}`,
  ];

  button.type = "button";
  button.dataset.manuscriptOpen = manuscript.id;
  setDisplayAttribute(button, "aria-label", `阅览${manuscript.title || "稿件"}`);
  setDisplayText(desc, meta.filter(Boolean).join(" · "));
  main.append(title, desc);
  button.append(main);
  return button;
}

function renderCreativeOverview(container, calls, manuscripts) {
  const openCalls = getOpenCreativeCalls(calls);

  if (openCalls.length) {
    const callSection = createElement("section", "creative-subsection creative-call-section");
    const grid = createElement("div", "creative-call-grid");

    openCalls.forEach((call) => {
      grid.append(renderCreativeCallCard(call));
    });
    callSection.append(createCreativeSubTitle("正在征集"), grid);
    container.append(callSection);
  }

  const manuscriptSection = createElement("section", "creative-subsection manuscript-section");
  const manuscriptList = createElement("div", "manuscript-list");
  const sortedManuscripts = sortByDateDesc(manuscripts.map((item) => ({
    ...item,
    date: item.publishDate,
  })));

  manuscriptSection.append(createCreativeSubTitle("稿件阅览"));

  if (!sortedManuscripts.length) {
    const empty = createElement("p", "empty-state manuscript-empty");
    const before = document.createTextNode(getDisplayText("来稿暂未陈列，欢迎通过“"));
    const link = createElement("a", "inline-panel-link", "联系我们");
    const after = document.createTextNode(getDisplayText("”向我们投递作品。"));

    link.href = "#contact";
    link.dataset.panelInlineLink = "contact";
    empty.append(before, link, after);
    manuscriptSection.append(empty);
    container.append(manuscriptSection);
    return;
  }

  sortedManuscripts.forEach((manuscript) => {
    manuscriptList.append(renderManuscriptRow(manuscript));
  });
  manuscriptSection.append(manuscriptList);
  container.append(manuscriptSection);
}

function renderCreativeCallDetail(container, call) {
  const detail = createElement("section", "creative-detail");
  const close = createElement("button", "product-detail-close creative-detail-close", "返回");
  const head = createElement("div", "creative-detail-head");
  const label = createElement("p", "item-label", call.status || "征集中");
  const title = createElement("h3");
  const summary = createElement("p", "creative-detail-summary");
  const meta = createElement("dl", "product-params creative-detail-meta");
  const body = createElement("div", "creative-detail-body");

  close.type = "button";
  close.dataset.creativeCallClose = "";
  setTextWithBreaks(title, call.name || "未命名征集");
  setTextWithBreaks(summary, call.summary || "简短说明整理中。");
  appendMetaRow(meta, "截止日期", getCreativeDeadlineText(call));
  appendMetaRow(meta, "投稿方向", getCreativeDirection(call) || "未公开");
  appendMetaRow(meta, "参与方式", call.participation || "未公开");

  if (call.note) {
    appendMetaRow(meta, "备注", call.note);
  }

  setTextWithBreaks(body, call.detail || "征集详情整理中。");
  head.append(label, title, summary, meta);
  detail.append(close, head, body);
  container.append(detail);
}

function renderCreativeSection(calls, manuscripts) {
  const creativeList = document.querySelector("[data-creative-list]");

  if (!creativeList) {
    return;
  }

  creativeCallsData = Array.isArray(calls) ? calls : [];
  manuscriptsData = Array.isArray(manuscripts) ? manuscripts : [];
  creativeList.textContent = "";

  const activeCall = creativeCallsData.find((call) => call.id === activeCreativeCallId);

  if (activeCreativeCallId && activeCall) {
    creativeList.classList.add("is-detail-view");
    renderCreativeCallDetail(creativeList, activeCall);
    return;
  }

  activeCreativeCallId = null;
  creativeList.classList.remove("is-detail-view");
  renderCreativeOverview(creativeList, creativeCallsData, manuscriptsData);
}

function escapeHtmlText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeRichHtml(value) {
  const template = document.createElement("template");
  const allowedTags = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "BLOCKQUOTE",
    "UL",
    "OL",
    "LI",
    "A",
    "HR",
    "H2",
    "H3",
    "H4",
  ]);

  template.innerHTML = String(value || "").trim();

  const clean = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }

      if (!allowedTags.has(child.tagName)) {
        const parent = child.parentNode;

        child.replaceWith(...Array.from(child.childNodes));
        if (parent) {
          clean(parent);
        }
        return;
      }

      Array.from(child.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const valueText = attribute.value || "";
        const isLinkAttribute =
          child.tagName === "A" && ["href", "title", "target", "rel"].includes(name);

        if (!isLinkAttribute || (name === "href" && /^javascript:/i.test(valueText))) {
          child.removeAttribute(attribute.name);
        }
      });

      if (child.tagName === "A") {
        child.target = "_blank";
        child.rel = "noopener noreferrer";
      }

      clean(child);
    });
  };

  clean(template.content);

  return template.innerHTML || `<p>${escapeHtmlText(getDisplayText("稿件正文整理中。"))}</p>`;
}

function getDisplayHtml(value) {
  const template = document.createElement("template");

  template.innerHTML = sanitizeRichHtml(value);

  if (currentTextScript === "traditional") {
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      node.nodeValue = toTraditionalText(node.nodeValue || "");
      node = walker.nextNode();
    }
  }

  return template.innerHTML;
}

function makeManuscriptArticleDocument(manuscript) {
  const baseHref = location.href.split("#")[0].split("?")[0];
  const title = getDisplayText(manuscript.title || "未命名稿件");
  const source = getDisplayText(getManuscriptSource(manuscript));
  const image = manuscript.image && manuscript.image.src ? manuscript.image : null;
  const attachment = manuscript.attachment && manuscript.attachment.src ? manuscript.attachment : null;
  const meta = [
    manuscript.author ? `${getDisplayText("作者")}：${getDisplayText(manuscript.author)}` : "",
    manuscript.type ? `${getDisplayText("类型")}：${getDisplayText(manuscript.type)}` : "",
    manuscript.publishDate
      ? `${getDisplayText("发布日期")}：${getDisplayText(formatFixedDate(manuscript.publishDate))}`
      : "",
    `${getDisplayText("来源")}：${source}`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="${currentTextScript === "traditional" ? "zh-Hant" : "zh-CN"}" data-text-script="${currentTextScript}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${escapeHtmlText(baseHref)}" />
    <title>${escapeHtmlText(title)} · ${escapeHtmlText(getDisplayText("子种大川"))}</title>
    <link rel="icon" type="image/png" href="assets/club-logo.png" />
    <link rel="stylesheet" href="styles.css?v=20260823-creative-call-polish" />
    <style>
      body { min-height: 100svh; }
      .article-page { width: min(880px, calc(100% - 36px)); margin: 0 auto; padding: clamp(34px, 7vw, 72px) 0; }
      .article-brand { display: inline-flex; align-items: center; gap: 10px; margin-bottom: clamp(34px, 6vw, 58px); color: var(--burgundy); font-family: var(--song-font); font-weight: 700; }
      .article-brand img { width: 2.8rem; height: 2.8rem; object-fit: contain; }
      .article-title { font-size: clamp(2.3rem, 6vw, 4.2rem); }
      .article-meta { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 18px 0 clamp(30px, 5vw, 52px); color: rgba(108, 94, 90, 0.78); font-family: var(--song-font); font-size: 0.96rem; }
      .article-body { color: var(--ink); font-family: var(--song-font); font-size: 1.06rem; line-height: 2; }
      .article-body > * { margin-top: 0; margin-bottom: 1.1em; }
      .article-body blockquote { margin-left: 0; padding-left: 1.2em; border-left: 1px solid rgba(116, 24, 31, 0.28); color: var(--muted); }
      .article-body a, .article-attachment { color: var(--burgundy); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.22em; }
      .article-image { margin: 0 0 clamp(26px, 4vw, 42px); }
      .article-image img { width: auto; max-width: 100%; height: auto; margin: 0 auto; }
      .article-attachment-wrap { margin-top: clamp(28px, 5vw, 50px); }
    </style>
  </head>
  <body>
    <main class="article-page">
      <a class="article-brand" href="index.html#home">
        <img src="assets/club-logo-small.webp" alt="" />
        <span>${escapeHtmlText(getDisplayText("子种大川"))}</span>
      </a>
      <article>
        <h1 class="article-title">${escapeHtmlText(title)}</h1>
        <div class="article-meta">
          ${meta.map((item) => `<span>${escapeHtmlText(item)}</span>`).join("")}
        </div>
        ${
          image
            ? `<figure class="article-image"><img src="${escapeHtmlText(image.src)}" alt="${escapeHtmlText(getDisplayText(image.alt || manuscript.title || ""))}" /></figure>`
            : ""
        }
        <div class="article-body">${getDisplayHtml(manuscript.body)}</div>
        ${
          attachment
            ? `<p class="article-attachment-wrap"><a class="article-attachment" href="${escapeHtmlText(attachment.src)}" target="_blank" rel="noopener noreferrer">${escapeHtmlText(getDisplayText(attachment.name || "附件"))}</a></p>`
            : ""
        }
      </article>
    </main>
  </body>
</html>`;
}

function makeMissingManuscriptDocument() {
  const baseHref = location.href.split("#")[0].split("?")[0];
  const title = getDisplayText("稿件暂未陈列");

  return `<!DOCTYPE html>
<html lang="${currentTextScript === "traditional" ? "zh-Hant" : "zh-CN"}" data-text-script="${currentTextScript}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${escapeHtmlText(baseHref)}" />
    <title>${escapeHtmlText(title)} · ${escapeHtmlText(getDisplayText("子种大川"))}</title>
    <link rel="icon" type="image/png" href="assets/club-logo.png" />
    <link rel="stylesheet" href="styles.css?v=20260823-creative-call-polish" />
  </head>
  <body>
    <main class="article-page">
      <a class="article-brand" href="index.html#home">
        <img src="assets/club-logo-small.webp" alt="" />
        <span>${escapeHtmlText(getDisplayText("子种大川"))}</span>
      </a>
      <article>
        <h1 class="article-title">${escapeHtmlText(title)}</h1>
        <div class="article-body"><p>${escapeHtmlText(getDisplayText("稿件正文整理中。"))}</p></div>
      </article>
    </main>
  </body>
</html>`;
}

function renderManuscriptReaderContent(content) {
  const data = window.ContentStore
    ? window.ContentStore.normalizeContent(content)
    : content;
  const manuscript = (data.creative?.manuscripts || []).find(
    (item) => item.id === manuscriptReaderId,
  );

  creativeCallsData = Array.isArray(data.creative?.calls) ? data.creative.calls : [];

  document.open();
  document.write(
    manuscript ? makeManuscriptArticleDocument(manuscript) : makeMissingManuscriptDocument(),
  );
  document.close();
}

function openManuscriptWindow(manuscript) {
  const url = new URL(location.href);

  url.search = "";
  url.searchParams.set("manuscript", manuscript.id);
  url.hash = "";
  window.open(url.toString(), "_blank", "noopener,noreferrer");
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
    const actions = createProductActionLinks(activeProduct);
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

    if (actions) {
      body.append(actions);
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

  filteredProducts.forEach((product, index) => {
    const article = createElement("article", "product-item product-gallery-item");
    const imageButton = createElement("button", "product-gallery-image");
    const image = createImageSlot(product, null, "thumbnail", {
      loading: index < 4 ? "eager" : "lazy",
      fetchPriority: index < 4 ? "high" : "low",
    });
    const titleButton = createElement("button", "product-gallery-caption");
    const productName = String(product.name || "制品").replace(/\s+/g, "");

    setTextWithBreaks(titleButton, product.name || "未命名制品");
    article.dataset.productId = product.id;
    imageButton.type = "button";
    imageButton.dataset.productSelect = product.id;
    setDisplayAttribute(imageButton, "aria-label", `查看${productName || "制品"}详情`);
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

function getSortedActivityPhotos(section) {
  return sortByDateDesc(getActivityPhotos(section));
}

function createCommunityPlaceholder(text = "照片整理中") {
  const placeholder = createElement("span", "community-placeholder", text);
  return placeholder;
}

function createCommunityCover(section, index) {
  const coverButton = createElement("button", "community-cover");
  const cover = section.cover && section.cover.src ? section.cover : null;
  const photoImages = getSortedActivityPhotos(section)
    .filter((photo) => photo.image && photo.image.src)
    .slice(0, 5);

  coverButton.type = "button";
  coverButton.dataset.communitySectionSelect = section.id;
  setDisplayAttribute(
    coverButton,
    "aria-label",
    `查看${section.name || `活动分区 ${index + 1}`}`,
  );

  if (cover) {
    const image = document.createElement("img");
    image.alt = cover.alt || section.name || "";
    setImageSource(image, cover.src, {
      loading: index < 2 ? "eager" : "lazy",
      fetchPriority: index < 2 ? "high" : "low",
    });
    coverButton.append(image);
  } else if (photoImages.length) {
    const collage = createElement("span", "community-cover-collage");

    photoImages.forEach((photo, photoIndex) => {
      const image = document.createElement("img");
      image.alt = photo.image.alt || photo.activity || section.name || "";
      setImageSource(image, photo.image.src, {
        loading: index < 2 ? "eager" : "lazy",
        fetchPriority: index < 2 ? "high" : "low",
      });
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
  setDisplayText(title, section.name || `活动分区 ${index + 1}`);
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

function createCommunityPhotoButton(section, photo, index = 0) {
  const button = createElement("button", "community-photo-item");

  button.type = "button";
  button.dataset.communityPhotoSelect = photo.id;
  setDisplayAttribute(
    button,
    "aria-label",
    `查看${photo.activity || section.name || "活动照片"}`,
  );

  if (photo.image && photo.image.src) {
    const image = document.createElement("img");
    image.alt = photo.image.alt || photo.activity || section.name || "";
    image.addEventListener("load", () => {
      setCommunityPhotoAspect(button, image);
      scheduleCommunityPhotoWallLayout(button.closest(".community-photo-wall"));
    });
    setImageSource(image, photo.image.src, {
      loading: index < 6 ? "eager" : "lazy",
      fetchPriority: index < 6 ? "high" : "low",
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

  button.dataset.photoAspect = ratio.toFixed(4);
  button.style.setProperty("--photo-aspect", ratio.toFixed(4));
  button.classList.toggle("is-portrait", ratio < 0.92);
  button.classList.toggle("is-landscape", ratio > 1.12);
  button.classList.toggle("is-square", ratio >= 0.92 && ratio <= 1.12);
}

function getCommunityPhotoWallObserver() {
  if (typeof ResizeObserver === "undefined") {
    return null;
  }

  if (!communityPhotoWallObserver) {
    communityPhotoWallObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => scheduleCommunityPhotoWallLayout(entry.target));
    });
  }

  return communityPhotoWallObserver;
}

function observeCommunityPhotoWall(wall) {
  const observer = getCommunityPhotoWallObserver();

  if (observer) {
    observer.observe(wall);
  }
}

function getCommunityPhotoGap(wall) {
  const styles = window.getComputedStyle(wall);
  const gap = parseFloat(styles.columnGap || styles.gap || styles.rowGap);

  return Number.isFinite(gap) ? gap : 14;
}

function getCommunityPhotoTargetHeight(width) {
  if (width <= 520) {
    return Math.max(138, Math.min(220, width * 0.46));
  }

  if (width <= 880) {
    return Math.max(150, Math.min(220, width * 0.27));
  }

  return Math.max(168, Math.min(236, width * 0.19));
}

function getCommunityPhotoItemRatio(item) {
  const ratio = Number(
    item.dataset.photoAspect || item.style.getPropertyValue("--photo-aspect"),
  );

  if (Number.isFinite(ratio) && ratio > 0) {
    return Math.max(0.32, Math.min(4.2, ratio));
  }

  return 4 / 3;
}

function isCommunityLandscape(ratio) {
  return ratio >= 1.18;
}

function isCommunityPortrait(ratio) {
  return ratio <= 0.9;
}

function makeCommunityPhotoEntry(item) {
  return {
    item,
    ratio: getCommunityPhotoItemRatio(item),
  };
}

function getCommunityPhotoMosaicAt(items, startIndex, width, gap, targetHeight) {
  if (width < 680 || startIndex + 2 >= items.length) {
    return null;
  }

  const entries = items.slice(startIndex, startIndex + 4).map(makeCommunityPhotoEntry);
  const [first, second, third, fourth] = entries;

  if (
    first &&
    second &&
    third &&
    isCommunityLandscape(first.ratio) &&
    isCommunityLandscape(second.ratio) &&
    isCommunityPortrait(third.ratio)
  ) {
    const portraits = [third];

    if (fourth && isCommunityPortrait(fourth.ratio)) {
      portraits.push(fourth);
    }

    const mosaic = createCommunityStackMosaic(
      [first, second],
      portraits,
      "stack-left",
      width,
      gap,
      targetHeight,
    );

    if (mosaic) {
      return {
        type: "mosaic",
        count: 2 + portraits.length,
        ...mosaic,
      };
    }
  }

  if (
    first &&
    second &&
    third &&
    isCommunityPortrait(first.ratio) &&
    isCommunityLandscape(second.ratio) &&
    isCommunityLandscape(third.ratio)
  ) {
    const portraits = [first];
    const landscapes = [second, third];

    const mosaic = createCommunityStackMosaic(
      landscapes,
      portraits,
      "stack-right",
      width,
      gap,
      targetHeight,
    );

    if (mosaic) {
      return {
        type: "mosaic",
        count: 3,
        ...mosaic,
      };
    }
  }

  if (
    first &&
    second &&
    third &&
    fourth &&
    isCommunityPortrait(first.ratio) &&
    isCommunityPortrait(second.ratio) &&
    isCommunityLandscape(third.ratio) &&
    isCommunityLandscape(fourth.ratio)
  ) {
    const mosaic = createCommunityStackMosaic(
      [third, fourth],
      [first, second],
      "stack-right",
      width,
      gap,
      targetHeight,
    );

    if (mosaic) {
      return {
        type: "mosaic",
        count: 4,
        ...mosaic,
      };
    }
  }

  return null;
}

function createCommunityStackMosaic(landscapes, portraits, direction, width, gap, targetHeight) {
  const landscapeFactor = landscapes.reduce((sum, entry) => sum + 1 / entry.ratio, 0);
  const portraitFactor = portraits.reduce((sum, entry) => sum + entry.ratio, 0);
  const portraitGapCount = Math.max(0, portraits.length - 1);
  const stackWidth =
    (width - gap * (1 + portraitGapCount + portraitFactor)) /
    (1 + landscapeFactor * portraitFactor);
  const height = stackWidth * landscapeFactor + gap;
  const minHeight = targetHeight * 0.9;
  const maxHeight = Math.min(820, targetHeight * 4);

  if (
    !Number.isFinite(stackWidth) ||
    !Number.isFinite(height) ||
    stackWidth < 120 ||
    height < minHeight ||
    height > maxHeight
  ) {
    return null;
  }

  return {
    direction,
    landscapes,
    portraits,
    stackWidth,
    height,
  };
}

function buildCommunityPhotoRows(items, width, gap, targetHeight) {
  const minHeight = targetHeight * 0.72;
  const rows = [];
  let index = 0;

  while (index < items.length) {
    const mosaic = getCommunityPhotoMosaicAt(items, index, width, gap, targetHeight);

    if (mosaic) {
      rows.push(mosaic);
      index += mosaic.count;
      continue;
    }

    const row = [];
    let ratioSum = 0;

    while (index < items.length) {
      if (row.length >= 2 && getCommunityPhotoMosaicAt(items, index, width, gap, targetHeight)) {
        break;
      }

      const entry = makeCommunityPhotoEntry(items[index]);
      const tentativeLength = row.length + 1;
      const tentativeRatio = ratioSum + entry.ratio;
      const tentativeGaps = gap * Math.max(0, tentativeLength - 1);
      const tentativeHeight = (width - tentativeGaps) / tentativeRatio;

      if (row.length && tentativeHeight < minHeight) {
        break;
      }

      row.push(entry);
      ratioSum += entry.ratio;
      index += 1;

      const gaps = gap * Math.max(0, row.length - 1);
      const height = (width - gaps) / ratioSum;

      if (height <= targetHeight || row.length >= 4 || index >= items.length) {
        break;
      }
    }

    if (row.length) {
      rows.push({
        type: "row",
        entries: row,
      });
    }
  }

  if (rows.length > 1) {
    const last = rows[rows.length - 1];
    const previous = rows[rows.length - 2];
    const minLastItems = width <= 560 ? 1 : 2;

    if (
      last.type === "row" &&
      previous.type === "row" &&
      last.entries.length < minLastItems &&
      previous.entries.length > minLastItems
    ) {
      last.entries.unshift(previous.entries.pop());
    }
  }

  return rows.filter(Boolean);
}

function setCommunityPhotoItemSize(item, width, height) {
  item.style.width = `${Math.max(1, width)}px`;
  item.style.height = `${Math.max(1, height)}px`;
  item.style.flex = "0 0 auto";
}

function createCommunityPhotoRowElement(
  layout,
  width,
  gap,
  targetHeight,
  maxHeight,
  isLast,
  isFirst,
) {
  const rowElement = createElement("div", "community-photo-row");
  const ratioSum = layout.entries.reduce((sum, entry) => sum + entry.ratio, 0);
  const gaps = gap * Math.max(0, layout.entries.length - 1);
  const fillHeight = (width - gaps) / ratioSum;
  const shouldKeepLoose = !isFirst && isLast && fillHeight > maxHeight;
  const height = isFirst
    ? fillHeight
    : shouldKeepLoose
      ? targetHeight
      : Math.min(fillHeight, maxHeight);

  rowElement.classList.toggle("is-loose", shouldKeepLoose);
  rowElement.style.setProperty("--community-photo-row-height", `${height}px`);

  layout.entries.forEach(({ item, ratio }) => {
    setCommunityPhotoItemSize(item, ratio * height, height);
    rowElement.append(item);
  });

  return rowElement;
}

function createCommunityMosaicElement(layout, gap) {
  const mosaic = createElement(
    "div",
    `community-photo-mosaic community-photo-mosaic-${layout.direction}`,
  );
  const stack = createElement("div", "community-photo-stack");
  const rail = createElement("div", "community-photo-rail");

  stack.style.width = `${Math.max(1, layout.stackWidth)}px`;
  stack.style.height = `${Math.max(1, layout.height)}px`;
  rail.style.height = `${Math.max(1, layout.height)}px`;
  mosaic.style.minHeight = `${Math.max(1, layout.height)}px`;

  layout.landscapes.forEach(({ item, ratio }) => {
    const height = layout.stackWidth / ratio;
    setCommunityPhotoItemSize(item, layout.stackWidth, height);
    stack.append(item);
  });

  layout.portraits.forEach(({ item, ratio }) => {
    setCommunityPhotoItemSize(item, layout.height * ratio, layout.height);
    rail.append(item);
  });

  if (layout.direction === "stack-right") {
    mosaic.append(rail, stack);
  } else {
    mosaic.append(stack, rail);
  }

  mosaic.style.gap = `${gap}px`;
  stack.style.gap = `${gap}px`;
  rail.style.gap = `${gap}px`;

  return mosaic;
}

function layoutCommunityPhotoWall(wall) {
  if (!wall || !wall.isConnected) {
    return;
  }

  const items = Array.from(wall.querySelectorAll(".community-photo-item"));

  if (!items.length) {
    return;
  }

  const width = wall.clientWidth;

  if (!width) {
    scheduleCommunityPhotoWallLayout(wall);
    return;
  }

  const gap = getCommunityPhotoGap(wall);
  const targetHeight = getCommunityPhotoTargetHeight(width);
  const maxHeight = targetHeight * 1.46;
  const layouts = buildCommunityPhotoRows(items, width, gap, targetHeight);
  const rowElements = layouts.map((layout, rowIndex) =>
    layout.type === "mosaic"
      ? createCommunityMosaicElement(layout, gap)
      : createCommunityPhotoRowElement(
          layout,
          width,
          gap,
          targetHeight,
          maxHeight,
          rowIndex === layouts.length - 1,
          rowIndex === 0,
        ),
  );

  wall.replaceChildren(...rowElements);
}

function scheduleCommunityPhotoWallLayout(wall) {
  if (!wall) {
    return;
  }

  const currentFrame = communityPhotoLayoutFrames.get(wall);

  if (currentFrame) {
    window.cancelAnimationFrame(currentFrame);
  }

  const nextFrame = window.requestAnimationFrame(() => {
    communityPhotoLayoutFrames.delete(wall);
    layoutCommunityPhotoWall(wall);
  });

  communityPhotoLayoutFrames.set(wall, nextFrame);
}

function renderCommunityPhotoWall(section) {
  const wall = createElement("div", "community-photo-wall");
  const photos = getSortedActivityPhotos(section);

  if (!photos.length) {
    wall.append(createElement("p", "empty-state", "照片待上传。"));
    return wall;
  }

  photos.forEach((photo, index) => {
    wall.append(createCommunityPhotoButton(section, photo, index));
  });

  observeCommunityPhotoWall(wall);
  scheduleCommunityPhotoWallLayout(wall);

  return wall;
}

function getCommunityPhotoColumnCount() {
  if (communityMobileQuery.matches) {
    return 1;
  }

  if (communityTabletQuery.matches) {
    return 2;
  }

  return 3;
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
    image.alt = photo.image.alt || photo.activity || section.name || "";
    setImageSource(image, photo.image.src, {
      preferOriginal: true,
      progressiveOriginal: true,
      loading: "eager",
      fetchPriority: "high",
    });
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
  const maintenance = document.querySelector("[data-contact-maintenance]");
  const maintenanceEmail = document.querySelector("[data-contact-maintenance-email]");
  const contactSide = document.querySelector(".contact-side");
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

  if (maintenance && maintenanceEmail) {
    const email = contact.maintenanceEmail || contact.webmasterEmail || "";
    const mailto = getMailtoHref(email);

    maintenance.hidden = !mailto;
    contactSide?.classList.toggle("has-maintenance", Boolean(mailto));
    maintenanceEmail.textContent = "";

    if (mailto) {
      const link = document.createElement("a");
      link.href = mailto;
      link.textContent = email.replace(/^mailto:/i, "").trim();
      maintenanceEmail.append(link);
    }
  }

  scheduleContactMethodSpacing();
}

function renderSiteContent(content) {
  currentSiteContent = content;
  updateStaticTextScript();

  const data = window.ContentStore
    ? window.ContentStore.normalizeContent(content)
    : content;
  const club = data.club || {};

  currentSiteData = data;
  productItemsData = Array.isArray(data.products) ? data.products : [];
  communitySectionsData = Array.isArray(data.activitySections)
    ? data.activitySections
    : [];
  creativeCallsData = Array.isArray(data.creative?.calls) ? data.creative.calls : [];
  manuscriptsData = Array.isArray(data.creative?.manuscripts)
    ? data.creative.manuscripts
    : [];
  productPanelRendered = false;
  communityPanelRendered = false;
  creativePanelRendered = false;

  renderBrandName(club.name);
  setTextWithBreaks(document.querySelector("[data-hero-lead]"), club.heroLead);
  renderAbout(club);
  renderExhibitions(data.exhibitions || []);
  renderHomeCreativeCalls(creativeCallsData);
  renderContact(club.contact || {});
  renderActiveContentPanel(true);

  const footer = document.querySelector("[data-footer-copyright]");
  if (footer) {
    setDisplayText(footer, club.copyright || "");
  }
}

async function renderActiveContentPanel(force = false) {
  const token = ++contentPanelRenderToken;
  const panelName = activePanelName;

  if (
    !currentSiteData ||
    (panelName !== "products" && panelName !== "moments" && panelName !== "creative")
  ) {
    return;
  }

  await ensureOptimizedMediaManifest();

  if (token !== contentPanelRenderToken || activePanelName !== panelName || !currentSiteData) {
    return;
  }

  if (panelName === "products" && (force || !productPanelRendered)) {
    renderProducts(currentSiteData.products || []);
    productPanelRendered = true;
  }

  if (panelName === "moments" && (force || !communityPanelRendered)) {
    renderCommunitySections(currentSiteData.activitySections || []);
    communityPanelRendered = true;
  }

  if (panelName === "creative" && (force || !creativePanelRendered)) {
    renderCreativeSection(
      currentSiteData.creative?.calls || [],
      currentSiteData.creative?.manuscripts || [],
    );
    creativePanelRendered = true;
  }
}

async function loadSiteContent() {
  if (!window.ContentStore) {
    return;
  }

  ensureOptimizedMediaManifest();

  if (isAdminPreview) {
    renderSiteContent(window.ContentStore.defaultContent);
    notifyPreviewReady();
    return;
  }

  const { content } = await window.ContentStore.loadContent();
  if (manuscriptReaderId) {
    renderManuscriptReaderContent(content);
    return;
  }

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

function runCallSummaryAnimation(direction) {
  if (!direction || !callSummaryList) {
    return;
  }

  window.clearTimeout(callSummaryAnimationTimer);
  callSummaryList.classList.remove("is-sliding-next", "is-sliding-prev");
  void callSummaryList.offsetWidth;
  callSummaryList.classList.add(`is-sliding-${direction}`);

  callSummaryAnimationTimer = window.setTimeout(() => {
    callSummaryList.classList.remove("is-sliding-next", "is-sliding-prev");
  }, 520);
}

function stopHomeDigestAutoPage() {
  window.clearTimeout(homeDigestAutoTimer);
  homeDigestAutoTimer = null;
}

function scheduleHomeDigestAutoPage(delay = homeDigestAutoDelayMs) {
  stopHomeDigestAutoPage();

  if (
    activePanelName !== "home" ||
    document.hidden ||
    getHomeDigestItems(activeHomeDigest).length <= getHomeDigestPageSize(activeHomeDigest)
  ) {
    return;
  }

  homeDigestAutoTimer = window.setTimeout(() => {
    advanceHomeDigestPage(1, true);
    scheduleHomeDigestAutoPage();
  }, delay);
}

function resetHomeDigestAutoPage() {
  scheduleHomeDigestAutoPage(homeDigestAutoDelayMs);
}

function advanceHomeDigestPage(step, shouldWrap = false) {
  const digest = activeHomeDigest;
  const totalPages = getHomeDigestTotalPages(digest);

  if (totalPages <= 1) {
    return false;
  }

  const currentIndex = getHomeDigestPageIndex(digest);
  let nextIndex = currentIndex + step;

  if (shouldWrap) {
    nextIndex = (nextIndex + totalPages) % totalPages;
  } else {
    nextIndex = Math.min(Math.max(nextIndex, 0), totalPages - 1);
  }

  if (nextIndex === currentIndex) {
    return false;
  }

  setHomeDigestPageIndex(digest, nextIndex);

  if (digest === "calls") {
    renderCallSummaryPage(step > 0 ? "next" : "prev");
  } else {
    renderExhibitionPage(step > 0 ? "next" : "prev");
  }

  return true;
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

  exhibitionList.classList.remove("is-balanced", "exhibition-visible-1", "exhibition-visible-2");
  exhibitionList.classList.toggle(
    "is-balanced",
    visibleOrder > 0 && visibleOrder < exhibitionPageSize,
  );
  exhibitionList.classList.toggle("exhibition-visible-1", visibleOrder === 1);
  exhibitionList.classList.toggle("exhibition-visible-2", visibleOrder === 2);

  if (exhibitionPrevButton) {
    exhibitionPrevButton.disabled = exhibitionPageIndex === 0;
  }

  if (exhibitionNextButton) {
    exhibitionNextButton.disabled = exhibitionPageIndex === totalPages - 1;
  }

  runExhibitionAnimation(direction);
}

function renderCallSummaryPage(direction = null) {
  if (!callSummaryItems.length) {
    return;
  }

  const pageSize = getCallSummaryPageSize();
  const totalPages = Math.max(1, Math.ceil(callSummaryItems.length / pageSize));

  callSummaryPageIndex = Math.min(Math.max(callSummaryPageIndex, 0), totalPages - 1);

  const firstVisibleIndex = callSummaryPageIndex * pageSize;
  const lastVisibleIndex = firstVisibleIndex + pageSize;
  let visibleOrder = 0;

  callSummaryItems.forEach((item, index) => {
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

  callSummaryList.classList.remove("is-balanced", "exhibition-visible-1", "exhibition-visible-2");
  callSummaryList.classList.toggle("is-balanced", visibleOrder > 0 && visibleOrder < pageSize);
  callSummaryList.classList.toggle("exhibition-visible-1", visibleOrder === 1);
  callSummaryList.classList.toggle("exhibition-visible-2", visibleOrder === 2);

  if (callPrevButton) {
    callPrevButton.disabled = callSummaryPageIndex === 0;
  }

  if (callNextButton) {
    callNextButton.disabled = callSummaryPageIndex === totalPages - 1;
  }

  runCallSummaryAnimation(direction);
}

links.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const nextPanel = normalizePanelName(link.dataset.panelLink);

    if (activeProductId) {
      resetProductDetailView(nextPanel === "products");
    }

    if (activeActivitySectionId || activeActivityPhotoId) {
      resetCommunityView(nextPanel === "moments");
    }

    if (activeCreativeCallId) {
      resetCreativeView(nextPanel === "creative");
    }

    history.pushState(null, "", `#${nextPanel}`);
    showPanel(nextPanel, false, true);
  });
});

if (scriptToggle) {
  scriptToggle.addEventListener("click", () => {
    setTextScript(currentTextScript === "traditional" ? "simplified" : "traditional");
  });
}

window.addEventListener("popstate", () => {
  showPanel(location.hash.slice(1), false, true);
});

window.addEventListener("scroll", scheduleReloadStateSave, { passive: true });
window.addEventListener("resize", scheduleContactMethodSpacing, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopHomeDigestAutoPage();
  } else {
    scheduleHomeDigestAutoPage();
  }
});
window.addEventListener("beforeunload", saveReloadState);
window.addEventListener("pagehide", saveReloadState);

if (contactSingleColumnQuery.addEventListener) {
  contactSingleColumnQuery.addEventListener("change", scheduleContactMethodSpacing);
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(scheduleContactMethodSpacing).catch(() => {});
}

const handleExhibitionBreakpointChange = () => {
  exhibitionPageIndex = 0;
  renderExhibitionPage();
  callSummaryPageIndex = 0;
  renderCallSummaryPage();
  scheduleHomeDigestAutoPage();
};

const handleCommunityBreakpointChange = () => {
  if (activeActivitySectionId && !activeActivityPhotoId) {
    renderCommunitySections(communitySectionsData);
  }
};

if (typeof exhibitionMobileQuery.addEventListener === "function") {
  exhibitionMobileQuery.addEventListener("change", handleExhibitionBreakpointChange);
} else if (typeof exhibitionMobileQuery.addListener === "function") {
  exhibitionMobileQuery.addListener(handleExhibitionBreakpointChange);
}

if (typeof communityTabletQuery.addEventListener === "function") {
  communityTabletQuery.addEventListener("change", handleCommunityBreakpointChange);
  communityMobileQuery.addEventListener("change", handleCommunityBreakpointChange);
} else if (typeof communityTabletQuery.addListener === "function") {
  communityTabletQuery.addListener(handleCommunityBreakpointChange);
  communityMobileQuery.addListener(handleCommunityBreakpointChange);
}

if (exhibitionPrevButton) {
  exhibitionPrevButton.addEventListener("click", () => {
    advanceHomeDigestPage(-1);
    resetHomeDigestAutoPage();
  });
}

if (exhibitionNextButton) {
  exhibitionNextButton.addEventListener("click", () => {
    advanceHomeDigestPage(1);
    resetHomeDigestAutoPage();
  });
}

if (callPrevButton) {
  callPrevButton.addEventListener("click", () => {
    advanceHomeDigestPage(-1);
    resetHomeDigestAutoPage();
  });
}

if (callNextButton) {
  callNextButton.addEventListener("click", () => {
    advanceHomeDigestPage(1);
    resetHomeDigestAutoPage();
  });
}

document.addEventListener("click", (event) => {
  const homeDigestTab = event.target.closest("[data-home-digest-tab]");

  if (homeDigestTab) {
    event.preventDefault();
    updateHomeDigestState(homeDigestTab.dataset.homeDigestTab);
    resetHomeDigestAutoPage();
    return;
  }

  const inlinePanelLink = event.target.closest("[data-panel-inline-link]");

  if (inlinePanelLink) {
    event.preventDefault();
    const nextPanel = normalizePanelName(inlinePanelLink.dataset.panelInlineLink);

    history.pushState(null, "", `#${nextPanel}`);
    showPanel(nextPanel, false, true);
    return;
  }

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
    productOverviewScrollY = window.scrollY;
    activeProductId = selectButton.dataset.productSelect;
    activeProductImageIndex = 0;
    productFilterMenuOpen = false;
    renderProducts(productItemsData);
    schedulePanelStartScroll();
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
    restoreContentScroll(
      productOverviewScrollY,
      () => activePanelName === "products" && !activeProductId,
    );
    return;
  }

  const sectionButton = event.target.closest("[data-community-section-select]");

  if (sectionButton) {
    communityOverviewScrollY = window.scrollY;
    activeActivitySectionId = sectionButton.dataset.communitySectionSelect;
    activeActivityPhotoId = null;
    renderCommunitySections(communitySectionsData);
    schedulePanelStartScroll();
    return;
  }

  const photoButton = event.target.closest("[data-community-photo-select]");

  if (photoButton) {
    communitySectionScrollY = window.scrollY;
    activeActivityPhotoId = photoButton.dataset.communityPhotoSelect;
    renderCommunitySections(communitySectionsData);
    schedulePanelStartScroll();
    return;
  }

  if (event.target.closest("[data-community-photo-close]")) {
    activeActivityPhotoId = null;
    renderCommunitySections(communitySectionsData);
    restoreContentScroll(
      communitySectionScrollY,
      () =>
        activePanelName === "moments" &&
        Boolean(activeActivitySectionId) &&
        !activeActivityPhotoId,
    );
    return;
  }

  if (event.target.closest("[data-community-close]")) {
    activeActivitySectionId = null;
    activeActivityPhotoId = null;
    renderCommunitySections(communitySectionsData);
    restoreContentScroll(
      communityOverviewScrollY,
      () =>
        activePanelName === "moments" &&
        !activeActivitySectionId &&
        !activeActivityPhotoId,
    );
    return;
  }

  const creativeCallButton = event.target.closest("[data-creative-call-select]");

  if (creativeCallButton) {
    if (activePanelName === "creative" && !activeCreativeCallId) {
      creativeOverviewScrollY = window.scrollY;
    } else {
      creativeOverviewScrollY = 0;
    }

    activeCreativeCallId = creativeCallButton.dataset.creativeCallSelect;
    creativePanelRendered = false;
    history.pushState(null, "", "#creative");
    showPanel("creative", false, true);
    renderCreativeSection(creativeCallsData, manuscriptsData);
    creativePanelRendered = true;
    return;
  }

  if (event.target.closest("[data-creative-call-close]")) {
    activeCreativeCallId = null;
    renderCreativeSection(creativeCallsData, manuscriptsData);
    restoreContentScroll(
      creativeOverviewScrollY,
      () => activePanelName === "creative" && !activeCreativeCallId,
    );
    return;
  }

  const manuscriptButton = event.target.closest("[data-manuscript-open]");

  if (manuscriptButton) {
    const manuscript = manuscriptsData.find(
      (item) => item.id === manuscriptButton.dataset.manuscriptOpen,
    );

    if (manuscript) {
      openManuscriptWindow(manuscript);
    }
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

updateStaticTextScript();
applySavedViewState(savedReloadState);
exhibitionItems = Array.from(document.querySelectorAll("[data-exhibition-item]"));
renderExhibitionPage();
showPanel(savedReloadState ? savedReloadState.panel : location.hash.slice(1));
loadSiteContent().then(() => {
  restoreSavedScroll(savedReloadState);
});
