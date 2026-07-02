(function () {
  const defaultConfig = {
    backend: "static",
    contentUrl: "data/site-data.json",
    storageKey: "zizhong-dachuan-site-content",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseTable: "site_content",
    supabaseContentId: "main",
  };

  const adminSessionKey = "zizhong-dachuan-admin-session";
  const localDatabaseName = "zizhong-dachuan-site-content-db";
  const localStoreName = "site-content";

  const defaultContent = {
    version: 1,
    club: {
      name: "子种大川",
      heroLead:
        "由四川大学学生发起建立的民间东方同人社团，\n致力于为每一位曾迸发创作的火花，但却并未付诸实践的准创作者们，提供一个以供迈出那第一步的舞台。",
      about: [
        "这里预留社团介绍，可放置成立背景、活动方向、成员气质与社团愿景。",
        "这一段可用于补充社团特色，例如创作、展览、出版、手作、公益或校园文化活动。",
      ],
      facts: [
        { label: "成立时间", value: "待填写" },
        { label: "活动地点", value: "待填写" },
        { label: "开放对象", value: "待填写" },
      ],
      contact: {
        qrcodes: [
          {
            id: "qrcode-1",
            name: "二维码位置待填写",
            image: { src: "", alt: "" },
          },
        ],
        methods: [
          { id: "contact-method-1", name: "群聊名称", number: "待填写" },
        ],
        friendLinks: [
          { id: "friend-link-1", name: "友情链接", number: "待填写", url: "" },
        ],
      },
      copyright: "© 上海アリス幻樂団. © 2026 子种大川. All rights reserved.",
    },
    exhibitions: [
      { id: "exhibition-1", name: "待公布", date: "", location: "待定", note: "" },
      { id: "exhibition-2", name: "待公布", date: "", location: "待定", note: "" },
      { id: "exhibition-3", name: "待公布", date: "", location: "待定", note: "" },
      { id: "exhibition-4", name: "待公布", date: "", location: "待定", note: "" },
      { id: "exhibition-5", name: "待公布", date: "", location: "待定", note: "" },
      { id: "exhibition-6", name: "待公布", date: "", location: "待定", note: "" },
    ],
    products: [
      {
        id: "product-1",
        name: "制品名称占位",
        type: "书刊",
        category: "类别占位",
        publishDate: "",
        image: { src: "", alt: "" },
        images: [],
        price: "待定",
        description: "这里填写制品简介、材质、灵感来源或购买说明。",
        attributes: [
          { label: "作者", value: "待填写" },
          { label: "编辑", value: "待填写" },
          { label: "美术", value: "待填写" },
          { label: "页数", value: "待填写" },
          { label: "开本", value: "待填写" },
        ],
      },
      {
        id: "product-2",
        name: "制品名称占位",
        type: "徽章",
        category: "类别占位",
        publishDate: "",
        image: { src: "", alt: "" },
        images: [],
        price: "待定",
        description: "这里填写制品简介、材质、灵感来源或购买说明。",
        attributes: [
          { label: "作者", value: "待填写" },
          { label: "尺寸", value: "待填写" },
          { label: "材质", value: "待填写" },
          { label: "工艺", value: "待填写" },
        ],
      },
      {
        id: "product-3",
        name: "制品名称占位",
        type: "手作",
        category: "类别占位",
        publishDate: "",
        image: { src: "", alt: "" },
        images: [],
        price: "待定",
        description: "这里填写制品简介、材质、灵感来源或购买说明。",
        attributes: [
          { label: "作者", value: "待填写" },
          { label: "尺寸", value: "待填写" },
          { label: "材质", value: "待填写" },
          { label: "附件", value: "待填写" },
        ],
      },
      {
        id: "product-4",
        name: "制品名称占位",
        type: "合同志",
        category: "类别占位",
        publishDate: "",
        image: { src: "", alt: "" },
        images: [],
        price: "待定",
        description: "这里填写制品简介、材质、灵感来源或购买说明。",
        attributes: [
          { label: "作者", value: "待填写" },
          { label: "编辑", value: "待填写" },
          { label: "美术", value: "待填写" },
          { label: "页数", value: "待填写" },
          { label: "开本", value: "待填写" },
        ],
      },
    ],
    activitySections: [
      {
        id: "activity-section-thp",
        name: "川大THP",
        description: "这里填写川大THP相关活动说明。",
        cover: { src: "", alt: "" },
        photos: [],
      },
      {
        id: "activity-section-kinsai",
        name: "幻想锦符祭",
        description: "这里填写幻想锦符祭相关活动说明。",
        cover: { src: "", alt: "" },
        photos: [],
      },
      {
        id: "activity-section-daily",
        name: "日常活动",
        description: "这里填写日常活动、社群聚会或创作交流说明。",
        cover: { src: "", alt: "" },
        photos: [],
      },
      {
        id: "activity-section-exhibition",
        name: "参展记录",
        description: "这里填写参展记录、摊位活动与现场回顾说明。",
        cover: { src: "", alt: "" },
        photos: [],
      },
    ],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getConfig() {
    return { ...defaultConfig, ...(window.SITE_CMS_CONFIG || {}) };
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeDateValue(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);

    if (!match) {
      return raw;
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
      return raw;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function normalizeImage(image, fallbackAlt = "") {
    if (image && typeof image === "object" && !Array.isArray(image)) {
      return {
        id: image.id || "",
        src: image.src || "",
        alt: image.alt || fallbackAlt || "",
      };
    }

    return {
      id: "",
      src: "",
      alt: fallbackAlt || "",
    };
  }

  function normalizeProductImages(item) {
    const images = toArray(item.images)
      .map((image, index) => ({
        ...normalizeImage(image, item.name || ""),
        id: image.id || `product-image-${index + 1}`,
      }))
      .filter((image) => image.src);

    const legacyImage = normalizeImage(item.image, item.name || "");

    if (!images.length && legacyImage.src) {
      return [{ ...legacyImage, id: legacyImage.id || "product-image-1" }];
    }

    return images;
  }

  function normalizeAttributes(item) {
    if (Array.isArray(item.attributes) && item.attributes.length) {
      return item.attributes
        .map((attribute) => ({
          label: attribute.label || attribute.key || "",
          value: attribute.value || "",
        }))
        .filter((attribute) => attribute.label || attribute.value);
    }

    if (item.params && typeof item.params === "object" && !Array.isArray(item.params)) {
      return Object.entries(item.params).map(([label, value]) => ({
        label,
        value: value || "",
      }));
    }

    return [];
  }

  function normalizeProductTypeName(type) {
    return type === "挂件" ? "手作" : type || "其他";
  }

  function normalizeQrCodes(contact, fallback) {
    if (Array.isArray(contact.qrcodes)) {
      return contact.qrcodes.map((item, index) => ({
        id: item.id || `qrcode-${index + 1}`,
        name: item.name || item.label || item.position || "",
        image: normalizeImage(
          item.image || { src: item.src || "", alt: item.alt || "" },
          "",
        ),
      }));
    }

    if (contact.qrText || contact.qrImage || contact.image) {
      return [
        {
          id: "qrcode-1",
          name: contact.qrText || "二维码",
          image: normalizeImage(
            contact.image || { src: contact.qrImage || "", alt: contact.qrText || "" },
            "",
          ),
        },
      ];
    }

    return fallback;
  }

  function normalizeNameNumberItems(items, fallback, prefix) {
    if (!Array.isArray(items)) {
      return fallback;
    }

    return items.map((item, index) => ({
      id: item.id || `${prefix}-${index + 1}`,
      name: item.name || item.label || "",
      number: item.number || item.value || item.url || item.href || "",
    }));
  }

  function normalizeFriendLinkItems(items, fallback, prefix) {
    if (!Array.isArray(items)) {
      return fallback;
    }

    return items.map((item, index) => ({
      id: item.id || `${prefix}-${index + 1}`,
      name: item.name || item.label || "",
      number: item.number || item.value || item.note || "",
      url: item.url || item.href || item.link || "",
    }));
  }

  function normalizeActivityPhotos(photos, sectionName) {
    return toArray(photos).map((photo, index) => ({
      id: photo.id || `activity-photo-${index + 1}`,
      image: normalizeImage(
        photo.image || { src: photo.src || "", alt: photo.alt || "" },
        photo.activity || sectionName || "",
      ),
      date: normalizeDateValue(photo.date),
      activity: photo.activity || "",
      description: photo.description || photo.note || "",
    }));
  }

  function normalizeActivitySections(sections, fallback) {
    const source = Array.isArray(sections) ? sections : fallback;

    return source.map((section, index) => {
      const name = section.name || "";

      return {
        id: section.id || `activity-section-${index + 1}`,
        name,
        description: section.description || "",
        cover: normalizeImage(section.cover, name),
        photos: normalizeActivityPhotos(section.photos, name),
      };
    });
  }

  function normalizeContent(content) {
    const base = clone(defaultContent);
    const source = content && typeof content === "object" ? content : {};
    const { activities: discardedActivities, ...cleanSource } = source;
    const club = source.club && typeof source.club === "object" ? source.club : {};
    const contact =
      club.contact && typeof club.contact === "object" ? club.contact : {};
    void discardedActivities;

    return {
      ...base,
      ...cleanSource,
      club: {
        ...base.club,
        ...club,
        about: toArray(club.about).length ? toArray(club.about) : base.club.about,
        facts: toArray(club.facts).length ? toArray(club.facts) : base.club.facts,
        contact: {
          qrcodes: normalizeQrCodes(contact, base.club.contact.qrcodes),
          methods: normalizeNameNumberItems(
            contact.methods,
            base.club.contact.methods,
            "contact-method",
          ),
          friendLinks: normalizeFriendLinkItems(
            contact.friendLinks || contact.links,
            base.club.contact.friendLinks,
            "friend-link",
          ),
        },
      },
      exhibitions: toArray(source.exhibitions).map((item, index) => ({
        id: item.id || `exhibition-${index + 1}`,
        name: item.name || "",
        date: normalizeDateValue(item.date),
        location: item.location || "",
        note: item.note || "",
      })),
      products: toArray(source.products).map((item, index) => {
        const images = normalizeProductImages(item);
        const cover = images[0] || normalizeImage(item.image, item.name || "");
        const type = normalizeProductTypeName(item.type);

        return {
          id: item.id || `product-${index + 1}`,
          name: item.name || "",
          type,
          category: normalizeProductTypeName(item.category || type),
          publishDate: item.publishDate || "",
          image: cover,
          images,
          price: item.price || "",
          description: item.description || "",
          attributes: normalizeAttributes(item),
        };
      }),
      activitySections: normalizeActivitySections(
        source.activitySections,
        base.activitySections,
      ),
    };
  }

  function isQuotaError(error) {
    const message = String(error && error.message ? error.message : error || "");
    return (
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      /quota|exceeded|存储|空间|容量/i.test(message)
    );
  }

  function openLocalDatabase() {
    if (typeof indexedDB === "undefined") {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(localDatabaseName, 1);

      request.addEventListener("upgradeneeded", () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(localStoreName)) {
          database.createObjectStore(localStoreName);
        }
      });

      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("blocked", () => {
        reject(new Error("本地内容数据库暂时无法打开，请关闭其他维护页后重试。"));
      });
    });
  }

  async function readIndexedDbContent(config) {
    const database = await openLocalDatabase();

    if (!database) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(localStoreName, "readonly");
      const store = transaction.objectStore(localStoreName);
      const request = store.get(config.storageKey);

      request.addEventListener("success", () => {
        database.close();
        resolve(request.result ? normalizeContent(request.result) : null);
      });
      request.addEventListener("error", () => {
        database.close();
        reject(request.error);
      });
    });
  }

  async function writeIndexedDbContent(config, content) {
    const database = await openLocalDatabase();

    if (!database) {
      return false;
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(localStoreName, "readwrite");
      const store = transaction.objectStore(localStoreName);
      const request = store.put(normalizeContent(content), config.storageKey);

      request.addEventListener("success", () => {
        database.close();
        resolve(true);
      });
      request.addEventListener("error", () => {
        database.close();
        reject(request.error);
      });
    });
  }

  function readLocalStorageContent(config) {
    try {
      const raw = localStorage.getItem(config.storageKey);
      return raw ? normalizeContent(JSON.parse(raw)) : null;
    } catch (error) {
      return null;
    }
  }

  function writeLocalStorageContent(config, content) {
    localStorage.setItem(config.storageKey, JSON.stringify(normalizeContent(content)));
  }

  async function getLocalContent() {
    const config = getConfig();

    try {
      const indexedContent = await readIndexedDbContent(config);

      if (indexedContent) {
        return indexedContent;
      }
    } catch (error) {
      console.warn(error);
    }

    return readLocalStorageContent(config);
  }

  async function saveLocalContent(content) {
    const config = getConfig();

    try {
      const savedToIndexedDb = await writeIndexedDbContent(config, content);

      if (savedToIndexedDb) {
        try {
          localStorage.removeItem(config.storageKey);
        } catch (error) {
          console.warn(error);
        }

        return;
      }
    } catch (error) {
      if (isQuotaError(error)) {
        throw new Error("本地保存空间不足。请删除一些图片，或改用尺寸更小的图片后再保存。");
      }

      console.warn(error);
    }

    try {
      writeLocalStorageContent(config, content);
    } catch (error) {
      if (isQuotaError(error)) {
        throw new Error("本地保存空间不足。请删除一些图片，或改用尺寸更小的图片后再保存。");
      }

      throw new Error("本地保存失败，请稍后重试。");
    }
  }

  async function loadBundledContent() {
    const config = getConfig();

    try {
      const response = await fetch(config.contentUrl, { cache: "no-cache" });

      if (!response.ok) {
        return null;
      }

      return normalizeContent(await response.json());
    } catch (error) {
      return null;
    }
  }

  function isCloudConfigured() {
    const config = getConfig();
    return (
      config.backend === "supabase" &&
      Boolean(config.supabaseUrl) &&
      Boolean(config.supabaseAnonKey)
    );
  }

  function supabaseUrl(path) {
    const config = getConfig();
    return `${config.supabaseUrl.replace(/\/$/, "")}${path}`;
  }

  function supabaseHeaders(token, extraHeaders = {}) {
    const config = getConfig();
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token || config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    };
  }

  async function readCloudContent() {
    const config = getConfig();
    const table = encodeURIComponent(config.supabaseTable);
    const id = encodeURIComponent(config.supabaseContentId);
    const url = supabaseUrl(`/rest/v1/${table}?id=eq.${id}&select=data&limit=1`);
    const response = await fetch(url, {
      headers: supabaseHeaders(null),
    });

    if (!response.ok) {
      throw new Error("读取云端内容失败。");
    }

    const rows = await response.json();
    return rows[0] && rows[0].data ? normalizeContent(rows[0].data) : null;
  }

  async function writeCloudContent(content, token) {
    if (!token) {
      throw new Error("请先登录维护账号。");
    }

    const config = getConfig();
    const table = encodeURIComponent(config.supabaseTable);
    const response = await fetch(supabaseUrl(`/rest/v1/${table}`), {
      method: "POST",
      headers: supabaseHeaders(token, {
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify({
        id: config.supabaseContentId,
        data: normalizeContent(content),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error("保存到云端失败，请检查登录状态或云端权限。");
    }

    return normalizeContent(content);
  }

  async function login(email, password) {
    if (!isCloudConfigured()) {
      throw new Error("尚未配置云端后台。");
    }

    const response = await fetch(supabaseUrl("/auth/v1/token?grant_type=password"), {
      method: "POST",
      headers: supabaseHeaders(null),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("登录失败，请检查账号和密码。");
    }

    const session = await response.json();
    sessionStorage.setItem(adminSessionKey, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(adminSessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function logout() {
    sessionStorage.removeItem(adminSessionKey);
  }

  async function loadContent(options = {}) {
    if (isCloudConfigured() && !options.preferLocal) {
      try {
        const cloudContent = await readCloudContent();

        if (cloudContent) {
          return { content: cloudContent, source: "cloud" };
        }
      } catch (error) {
        console.warn(error);
      }
    }

    const localContent = await getLocalContent();

    if (localContent) {
      return { content: localContent, source: "local" };
    }

    const bundledContent = await loadBundledContent();

    if (bundledContent) {
      return { content: bundledContent, source: "bundled" };
    }

    return { content: normalizeContent(defaultContent), source: "default" };
  }

  async function saveContent(content, options = {}) {
    const normalized = normalizeContent(content);

    if (isCloudConfigured()) {
      const saved = await writeCloudContent(normalized, options.token);

      try {
        await saveLocalContent(saved);
      } catch (error) {
        console.warn(error);
      }

      return { content: saved, target: "cloud" };
    }

    await saveLocalContent(normalized);
    return { content: normalized, target: "local" };
  }

  window.ContentStore = {
    clone,
    defaultContent,
    getConfig,
    getSession,
    isCloudConfigured,
    loadContent,
    login,
    logout,
    normalizeContent,
    saveContent,
  };
})();
