# isales-web 视觉语言规范

本文档是 `isales-web` 客户面 admin UI 的**视觉迭代标准**。新增 view、新增
组件、或调整任何已有 view 的样式时，**必须**先读本文档并遵循其约定。

视觉语言对齐 Figma Make 设计稿（`fileKey: nerQwSnKLKJYWiGGb5NN3C`）。
设计 token 的唯一事实来源（SSOT）是 `src/styles/design-tokens.css` —— 本文档
不重复 token 的具体数值，只规定**怎么用**。

适用范围：6 个客户面 view（Leads / Calls / Appointments / 3 个 Config）+
其共享组件 + TopNav / DefaultLayout。`/operations/*` 下的运营 view 沿用旧
Element Plus 风格，不强制套用本规范（迁移时可逐步对齐）。

---

## 0. 总则

- 颜色、字号、字重、行高、间距、圆角、阴影 **一律使用** `design-tokens.css`
  暴露的 `var(--isales-*)`。**禁止**在组件里硬编码这些值（`#1890ff`、`16px`、
  `8px` 等）。
- 唯一允许的硬编码例外：token 体系里没有、且仅单处使用的颜色（例如
  Leads 的 AI banner 用到的 `#f0fdf4` 浅绿底）。出现这种情况应在代码里写明
  原因，并考虑是否值得提升为 token。
- 改样式前先看是否已有共享组件 / 既有模式（见 §6、§7），优先复用，不要
  重新发明。
- 用 Element Plus 的**基础组件**（Button / Input / Select / Dialog / Switch /
  Slider / Pagination 等），但把它们包在我们自己控制的卡片 / 页头 / 区块里。
  **不 fork** EP 组件；EP 主题已通过 `element-plus-theme.scss` 桥接到 token。

---

## 1. 排版

中文密致基线，`<html>` 的 base font-size 是 `--isales-font-size-base`（14px）。

| token | 用途 |
|---|---|
| `--isales-font-size-title-1` (20) | 页面主标题（PageHeader） |
| `--isales-font-size-title-2` (17) | section / 卡片组标题、卡片主体名称 |
| `--isales-font-size-title-3` (15) | 卡片标题、dialog 标题、配置卡标题 |
| `--isales-font-size-body` (14) | 正文、表单、按钮 |
| `--isales-font-size-sm` (13) | 卡片副文、meta 值、列表说明 |
| `--isales-font-size-xs` (12) | caption、meta 标签、徽标 |
| `--isales-font-size-2xs` (11) | 角标、时间戳 |

- 字重只用四档：`--isales-font-weight-{normal|medium|semibold|bold}`。
  标题用 `semibold`，正文 `normal`，强调 `medium`。**少用 bold**。
- 行高：标题用 `--isales-line-height-tight`，中文正文用
  `--isales-line-height-normal`，紧凑信息块用 `--isales-line-height-snug`。
- 标题加 `--isales-letter-spacing-tight`；全大写 / 标签类加
  `--isales-letter-spacing-wide`。
- 数字密集字段（电话、ID、时长、时间戳）加 `font-variant-numeric:
  tabular-nums`（或 `.tabular-nums` class）。

---

## 2. 间距

只用 `--isales-space-1..12`（4px 倍数）。约定俗成的取值：

| 场景 | token |
|---|---|
| 卡片内边距 | `--isales-space-5` (20) |
| 卡片内部块间距（header / meta / actions） | `--isales-space-4` (16) |
| 网格 / 列表项间距 | `--isales-space-4` (16) |
| 行内紧凑间距（图标与文字、meta 行之间） | `--isales-space-2` (8) |
| 页头与内容之间 | `--isales-space-5` (20) |
| section 之间 | `--isales-space-6`~`8` |

主内容区宽度 `--isales-container-max`（1280），左右留白
`--isales-container-px`。

---

## 3. 颜色

- 主色 `--isales-primary`（近黑）；主按钮、品牌 logo 用它。
- 文字：主文本 `--isales-foreground`，次要 / 标签 `--isales-muted-foreground`。
- 背景：页面 `--isales-muted`，卡片 / 弹层 `--isales-card`。
- 6 个语义状态色族，每族三档：`-100`（浅底）/ `-700`（强调描边、进度条）/
  `-800`（文字）。语义映射固定：

  | 色族 | 语义 |
  |---|---|
  | blue | new / answered / 信息 |
  | yellow | contacted / pending / 中意向 |
  | green | interested / confirmed / completed / 高意向 |
  | purple | appointed |
  | gray | visited / cancelled / 无意向 |
  | red | lost / failed / 危险操作 |

  状态 → 色 / 文案的映射统一走 `composables/useStatusMeta.ts`，不要在 view
  里各写一份。

---

## 4. 形状与层次

- 圆角：徽标 / pill 用 `9999px`；卡片用 `--isales-radius-lg`（12）；icon
  容器 / 输入类用 `--isales-radius-md`（8）；小元素 `--isales-radius-sm`（6）。
- 边框：用 `--isales-border`（很淡的灰）。**靠留白和淡边框分隔，不用粗重
  描边**。
- 阴影：静态卡片**不挂阴影**或仅 `--isales-shadow-sm`；hover 抬到
  `--isales-shadow-md`；浮层 / sticky 条用 `--isales-shadow-lg`。
- hover 反馈优先用阴影，不要 hover 时把边框加深成深色。

---

## 5. 图标

- 客户面 view 一律用 `lucide-vue-next`。运营 view 保留
  `@element-plus/icons-vue`。
- 尺寸约定：行内文字旁 `14`；按钮内 `16`；导航 / 圆按钮 `16~18`；
  页头 / 区块标题 `20`。
- 图标颜色继承文字色（`currentColor`），不单独设色，除非是语义强调。

---

## 6. 组件模式

以下是已确立的视觉模式。新页面**套用**这些模式，不要另起炉灶。
（`views/Leads/LeadList.vue` 是当前的参考实现。）

### 页头 `<PageHeader>`

纯文字 —— 主标题（title-1）+ 副标题（sm，muted）。**不带左侧 icon 方块**。
副标题尽量是动态信息（如「共 N 条线索」），不写空话。右侧 `actions` 插槽
放页面级操作按钮。

### 卡片

白底 + 1px `--isales-border` + `radius-lg` + `padding: space-5`。纵向
flex，内部按 `header / meta / actions` 分块，块间 `space-4`。hover 抬
`shadow-md`。网格容器用 `align-items: stretch` 让同行卡片等高，操作区
`margin-top: auto` 贴底对齐。卡片头部不放头像圆圈，直接「主名称 + 次要
信息」。

### 状态徽标 `<StatusBadge>`

无边框 pill：`-100` 底 + `-800` 文字，`color` 传色族名。

### meta 信息行

「标签 + 值」单行时两端对齐：标签贴左（muted），值贴右（foreground）。
多行文本字段（备注、地址、指引等）改成上下块 —— 标签一行、内容一行。
空值显示灰色占位文案（「暂无备注」），不留空。

### 操作区

主操作用主色按钮 `flex: 1` 撑开；次要 / 图标操作用 **40×40 icon 小方钮**
（白底、`--isales-border` 淡边框、`radius-md`，hover 进 `--isales-muted`，
危险操作 hover 进 `red-100`）。不要把多个文字按钮等宽平铺。

### 提示横幅 banner

整圈描边卡片式 —— 同色系浅底 + 同色描边 + `radius` + 左侧图标 + 文字。
**不用** `el-alert` 默认的左色条样式。

### 空态

独立容器内居中（不要塞进 grid 的第一格被钉在左上）：`el-empty` + 虚线
边框 + card 底 + 上下 `space-8` 内边距。

### sticky 保存条

配置类 view 底部用 sticky save bar：`--isales-card` 底 + `shadow-lg` +
左侧说明文字（xs，muted）+ 右侧主按钮。

---

## 7. 共享组件清单

| 组件 | 路径 | 用途 |
|---|---|---|
| `PageHeader` | `components/Common/PageHeader.vue` | 页头 |
| `StatusBadge` | `components/Common/StatusBadge.vue` | 状态徽标 |
| `IconButton` | `components/Common/IconButton.vue` | 40×40 图标小方钮（次要操作） |
| `PromptTierEditor` | `components/Campaign/PromptTierEditor.vue` | per-campaign 并行 prompt tier 编辑 |

状态映射工具：`composables/useStatusMeta.ts`。

参考实现：`views/Leads/LeadList.vue`、`views/Calls/CallList.vue`、
`components/Appointment/AppointmentCard.vue` 三处卡片均已符合本指南，可直接
照抄结构。

---

## 8. 待收敛（已知不一致）

迭代到对应 view 时按本指南顺手收敛，不必专门开 change：

- `meta-row` / `meta-row__label` / `meta-row__value` 这套「label 左 / value
  右」样式目前在 LeadList / CallList / AppointmentCard 各写了一份等价的
  scoped CSS；若再出现第四处，考虑抽成全局 utility 或 `<MetaRow>` 组件。
- AI banner 目前是 `LeadList.vue` 局部实现；若其他 view 需要同款，提取为
  共享组件。
- 3 个配置 view（AICallConfig / VoiceChannelConfig / ModelProviderConfig）
  已 token 化但卡片结构未完全套用 §6，迭代时对齐。
- 运营 view（`/operations/*`）整体仍是旧 EP 风格，长期可选择性迁移。
