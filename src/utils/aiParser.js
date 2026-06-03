export const DEFAULT_RESUME_DATA = {
  basicInfo: {
    name: "李自强",
    title: "前端开发专家",
    phone: "13800138000",
    email: "li.ziqiang@example.com",
    wechat: "ziqiang_dev",
    github: "github.com/ziqiang-dev",
    summary: "5 年以上前端开发经验，精通 React/Vue 生态，专注于高性能 Web 应用与移动端混合开发。主导过多个大型系统的架构设计，善于解决前端工程化与性能优化难题。"
  },
  education: [
    {
      school: "江南大学",
      major: "计算机科学与技术",
      degree: "本科",
      date: "2016.09 - 2020.06",
      description: "主修操作系统、计算机网络、数据结构与算法。绩点 3.75/4.00，连续两年获国家励志奖学金。"
    }
  ],
  experience: [
    {
      company: "未来科技有限公司",
      role: "高级前端开发工程师",
      date: "2020.07 - 至今",
      description: "1. 负责核心 SaaS 产品线前端架构升级，首屏加载时间（FCP）缩减 45%\n2. 搭建企业级通用组件库与工程化规范脚手架，团队开发效率提升 30%\n3. 指导 3 名初中级开发人员，推行自动化 CI/CD 流程"
    }
  ],
  projects: [
    {
      name: "星河智联低代码可视化平台",
      role: "前端技术负责人",
      date: "2022.03 - 2023.01",
      description: "基于 React + Canvas 研发高性能画布引擎，支持千级组件流畅拖动。\n优化状态管理与虚拟滚动管道，处理十万级数据点时不卡顿。\n实现一键导出单页大图及 PDF 报告功能。"
    }
  ],
  skills: [
    "JavaScript (ES6+), TypeScript, HTML5/CSS3",
    "React (Hooks, Redux, Zustand), Vue 3, Next.js",
    "Node.js, Express, RESTful API, PostgreSQL",
    "Vite, Webpack, CI/CD (GitHub Actions), Docker, Git"
  ]
};

async function parseWithLLM(text, config) {
  const { apiUrl, apiKey, modelName } = config;

  const systemPrompt = `你是一个专业的 HR 助手和简历结构化抽取专家。你的任务是把用户输入的杂乱无章的、AI 生成的简历文本转化为标准的 JSON 数据。
不要包含任何 markdown 标记、解释或多余的文字，必须只返回纯 JSON 格式的字符串。
必须严格遵循以下 JSON 数据格式，不允许添加额外的根节点属性：

{
  "basicInfo": {
    "name": "姓名",
    "title": "求职意向/专业岗位名",
    "phone": "手机号",
    "email": "电子邮箱",
    "wechat": "微信",
    "github": "Github链接或个人主页",
    "summary": "个人总结或自我评价，段落在一页纸内应言简意赅"
  },
  "education": [
    {
      "school": "学校名称",
      "major": "专业名称",
      "degree": "学历（如本科、硕士）",
      "date": "起止时间（如 2020.09 - 2024.06）",
      "description": "教育背景描述，如主修课程、荣誉奖项等"
    }
  ],
  "experience": [
    {
      "company": "公司名称",
      "role": "岗位角色/职务",
      "date": "起止时间（如 2023.07 - 2024.12 或 至今）",
      "description": "工作职责和业绩，使用换行符 \\n 分割多个要点"
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "项目中的角色",
      "date": "起止时间",
      "description": "项目介绍、职责和技术栈业绩，使用换行符 \\n 分割要点"
    }
  ],
  "skills": [
    "技能组1（例如：熟练掌握 React, JavaScript, ES6）",
    "技能组2（例如：掌握 Node.js, Python, PostgreSQL）"
  ]
}

要求：
1. 语言：统一使用简体中文。
2. 保持经历的简洁性，以匹配保持在一页内的约束。
3. 如果某些字段在输入中不存在，请留空串 ""，不要随便虚构。`;

  function normalizeUrl(url) {
    if (!url) return '';
    url = url.replace(/\/+$/, '');
    if (url.includes('/chat/completions') || url.match(/\/v\d+\/chat\/completions$/)) return url;
    if (url.includes('api.openai.com')) return url + '/v1/chat/completions';
    if (url.includes('api.deepseek.com')) return url + '/chat/completions';
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return url + '/v1/chat/completions';
    }
    return url + '/chat/completions';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(normalizeUrl(apiUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName || "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`API 请求失败: ${response.status} ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    let jsonStr = data.choices?.[0]?.message?.content || '';

    jsonStr = jsonStr.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    const parsed = JSON.parse(jsonStr);

    return sanitizeParsedData(parsed);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('API 请求超时（30秒）');
    }
    console.error("AI 接口解析失败，将使用本地备用解析器:", err);
    throw err;
  }
}

function sanitizeParsedData(data) {
  const result = {
    basicInfo: { name: "", title: "", phone: "", email: "", wechat: "", github: "", summary: "" },
    education: [],
    experience: [],
    projects: [],
    skills: []
  };

  if (data.basicInfo) {
    result.basicInfo = { ...result.basicInfo, ...data.basicInfo };
  }
  if (Array.isArray(data.education)) {
    result.education = data.education.map(e => ({
      school: e.school || "",
      major: e.major || "",
      degree: e.degree || "",
      date: e.date || "",
      description: e.description || ""
    }));
  }
  if (Array.isArray(data.experience)) {
    result.experience = data.experience.map(e => ({
      company: e.company || "",
      role: e.role || "",
      date: e.date || "",
      description: e.description || ""
    }));
  }
  if (Array.isArray(data.projects)) {
    result.projects = data.projects.map(p => ({
      name: p.name || "",
      role: p.role || "",
      date: p.date || "",
      description: p.description || ""
    }));
  }
  if (Array.isArray(data.skills)) {
    result.skills = data.skills.filter(s => typeof s === "string" && s.trim() !== "");
  } else if (typeof data.skills === "object" && data.skills !== null) {
    result.skills = Object.values(data.skills).map(val => String(val));
  }

  return result;
}

export function parseWithLocalRules(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");

  const result = {
    basicInfo: { name: "", title: "", phone: "", email: "", wechat: "", github: "", summary: "" },
    education: [],
    experience: [],
    projects: [],
    skills: []
  };

  const phoneRegex = /(1[3-9]\d{9})/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) result.basicInfo.phone = phoneMatch[1];

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) result.basicInfo.email = emailMatch[1];

  const nameBlacklist = ["求职", "简历", "意向", "电话", "邮箱", "自我", "评价", "总结", "个人"];
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(line) && !nameBlacklist.some(b => line.includes(b))) {
      result.basicInfo.name = line;
      break;
    }
  }
  if (!result.basicInfo.name && lines[0] && lines[0].length < 8 && !lines[0].includes(":") && !lines[0].includes("：")) {
    result.basicInfo.name = lines[0];
  }

  const titleRegex = /(意向|求职意向|期望职位|岗位|职务|职位|方向)[:：]?\s*([^\n,，|]+)/i;
  const titleMatch = text.match(titleRegex);
  if (titleMatch) {
    result.basicInfo.title = titleMatch[2].trim();
  } else {
    const titleFromEdu = text.match(/[··]\s*([^\s·（（]{2,10})\s*[（(]/);
    if (titleFromEdu) {
      result.basicInfo.title = titleFromEdu[1].trim();
    } else {
      const jobKeywords = ["工程师", "开发", "设计师", "运营", "经理", "产品", "文秘", "选调生", "专员", "教师", "预防医学", "临床", "药学", "护理", "数据", "研究", "分析"];
      for (let i = 0; i < Math.min(lines.length, 6); i++) {
        const line = lines[i];
        if (jobKeywords.some(key => line.includes(key)) && line.length < 15 && !line.includes("经历") && !line.includes("项目") && !line.includes("科研")) {
          result.basicInfo.title = line;
          break;
        }
      }
    }
  }

  const skillLines = [];
  let inSkillSection = false;
  lines.forEach(line => {
    if (/^(专业技能|个人技能|掌握技能|核心技能)/.test(line) && line.length < 10) {
      inSkillSection = true;
      return;
    }
    if (inSkillSection) {
      if (/^(科研|实习|工作|项目|学生工作|荣誉|教育|社会实践)/.test(line) && line.length < 10) {
        inSkillSection = false;
        return;
      }
      const cleaned = line.replace(/^[-•·*]\s*/, "").trim();
      if (cleaned) {
        const parts = cleaned.split(/[,，、;；]/).map(s => s.trim()).filter(s => s && s.length > 1);
        parts.forEach(p => {
          if (!skillLines.some(existing => existing.includes(p))) skillLines.push(p);
        });
      }
    }
  });
  if (skillLines.length > 0) {
    result.skills = skillLines.slice(0, 8);
  }

  let currentSection = "";
  let currentEdu = null;
  let currentExp = null;
  let currentProj = null;
  let summaryLines = [];
  let expAppendOnly = false;

  function detectSection(line) {
    const t = line.trim();
    if (t.length >= 10) return "";
    if (/^(教育背景|教育经历|学历教育)/.test(t)) return "edu";
    if (/^(科研经历|科研项目)/.test(t)) return "proj";
    if (/^(实习经历|工作经历|实践经历)/.test(t)) return "exp";
    if (/^(学生工作|社会实践|学生活动)/.test(t)) return "exp-append";
    if (/^(专业技能|掌握技能|核心技能)/.test(t)) return "edu-done";
    if (/^(荣誉奖励|获奖情况|所获荣誉|荣誉)/.test(t)) return "";
    if (/^(自我评价|个人总结|个人简介)/.test(t)) return "summary";
    if (/^教育/.test(t) && t.length < 6) return "edu";
    if (/^工作/.test(t) && t.length < 6) return "exp";
    if (/^项目/.test(t) && t.length < 6) return "proj";
    if (/^自我/.test(t) && t.length < 6) return "summary";
    return "";
  }

  lines.forEach(line => {
    const section = detectSection(line);
    if (section) {
      currentSection = section === "exp-append" ? "exp" : section;
      expAppendOnly = section === "exp-append";
      return;
    }

    if (currentSection === "edu") {
      if ((line.includes("大学") || line.includes("学院")) && line.length < 40 && !/^(交流|交换|访学|暑期)/.test(line)) {
        if (currentEdu) result.education.push(currentEdu);
        let degree = "本科";
        if (line.includes("硕士") || line.includes("研究生")) degree = "硕士";
        else if (line.includes("博士")) degree = "博士";
        else if (line.includes("大专") || line.includes("专科")) degree = "大专";
        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今|毕业))/);
        const date = dateMatch ? dateMatch[1] : "";
        let school = "", major = "";
        if (line.includes("|")) {
          const parts = line.split("|").map(s => s.trim());
          school = parts.find(p => p.includes("大学") || p.includes("学院")) || parts[0] || "";
          const rest = parts.filter(p => p !== school && !/^\d{4}/.test(p)).join(" ");
          const mm = rest.match(/^([^\s·（(]+)/);
          major = mm ? mm[1] : "";
        } else {
          const parts = line.split(/[\s,，|]+/).filter(p => p !== "");
          school = parts.find(p => p.includes("大学") || p.includes("学院")) || parts[0] || "";
          major = parts.find(p => !p.includes("大学") && !p.includes("学院") && !/^(硕士|本科|博士|大专|专科)$/.test(p) && !/^\d{4}/.test(p) && p.length < 10) || "";
        }
        currentEdu = { school, major, degree, date, description: "" };
      } else if (currentEdu) {
        currentEdu.description += (currentEdu.description ? "\n" : "") + line;
      }
    }
    else if (currentSection === "exp") {
      const pipeParts = line.split("|").map(s => s.trim());
      const hasDate = /\d{4}[.\-/]/.test(line);
      const hasInstitution = /(公司|集团|中心|医院|局|疾控|大学|学院|机构|署|办)/.test(line);
      if (!expAppendOnly && pipeParts.length >= 2 && (hasDate || hasInstitution || pipeParts[0].length < 20)) {
        if (currentExp) result.experience.push(currentExp);
        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今))/);
        currentExp = {
          company: pipeParts[0].replace(/^[\d]+[.、\s)]*/, "").trim() || "",
          role: pipeParts[1] || "",
          date: dateMatch ? dateMatch[1] : "",
          description: ""
        };
      } else if (!expAppendOnly && hasInstitution && line.length < 40) {
        if (currentExp) result.experience.push(currentExp);
        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今))/);
        const parts = line.split(/[\s,，|]+/).filter(p => p !== "");
        const company = (parts.find(p => /(公司|集团|中心|医院|局|疾控|大学|学院|机构|署|办)/.test(p)) || parts[0] || "").replace(/^[\d]+[.、\s)]*/, "").trim();
        const role = parts.find(p => !/(公司|集团|中心|医院|局|疾控|大学|学院|机构|署|办)/.test(p) && !p.includes("至今") && !/^\d{4}/.test(p) && !/^[.\-/]/.test(p)) || "";
        currentExp = { company, role, date: dateMatch ? dateMatch[1] : "", description: "" };
      } else if (currentExp) {
        currentExp.description += (currentExp.description ? "\n" : "") + line;
      }
    }
    else if (currentSection === "proj") {
      const pipeParts = line.split("|").map(s => s.trim());
      const hasDate = /\d{4}[.\-/]/.test(line);
      if (pipeParts.length >= 2 && (hasDate || pipeParts[0].length < 30)) {
        if (currentProj) result.projects.push(currentProj);
        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今))/);
        currentProj = {
          name: pipeParts[0] || "",
          role: pipeParts.length >= 3 ? pipeParts[1] : (line.includes("负责人") ? "项目负责人" : "核心成员"),
          date: dateMatch ? dateMatch[1] : "",
          description: ""
        };
      } else if ((line.includes("项目") || line.includes("系统") || line.includes("平台") || line.includes("应用")) && line.length < 40) {
        if (currentProj) result.projects.push(currentProj);
        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今))/);
        const parts = line.split(/[\s,，|]+/).filter(p => p !== "");
        const name = parts.find(p => p.includes("项目") || p.includes("系统") || p.includes("平台") || p.includes("应用")) || parts[0] || "";
        const role = parts.find(p => p !== name && !p.includes("至今") && !/^\d{4}/.test(p) && !/^[.\-/]/.test(p)) || "核心成员";
        currentProj = { name, role, date: dateMatch ? dateMatch[1] : "", description: "" };
      } else if (currentProj) {
        currentProj.description += (currentProj.description ? "\n" : "") + line;
      }
    }
    else if (currentSection === "summary") {
      summaryLines.push(line);
    }
  });

  if (currentEdu) result.education.push(currentEdu);
  if (currentExp) result.experience.push(currentExp);
  if (currentProj) result.projects.push(currentProj);

  if (summaryLines.length > 0) result.basicInfo.summary = summaryLines.join("\n");
  if (!result.basicInfo.summary) {
    const summaryPrefix = text.match(/(已获保研资格|保研|推免|推研)/);
    if (summaryPrefix) result.basicInfo.summary = summaryPrefix[1];
  }

  result.projects.forEach(p => { p.name = p.name.replace(/^[\d]+[.、\s)]*/, "").trim(); });
  result.experience.forEach(e => { e.company = e.company.replace(/^[\d]+[.、\s)]*/, "").trim(); });

  return result;
}

export async function parseResumeText(text, config) {
  if (!text || text.trim() === "") {
    return DEFAULT_RESUME_DATA;
  }

  if (config && config.apiUrl && config.apiKey) {
    try {
      return await parseWithLLM(text, config);
    } catch (err) {
      console.warn("大模型解析出错，降级使用本地解析器:", err.message);
      return parseWithLocalRules(text);
    }
  } else {
    return parseWithLocalRules(text);
  }
}
