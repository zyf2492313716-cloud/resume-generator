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

  try {
    const response = await fetch(apiUrl, {
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
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: 状态码 ${response.status}`);
    }

    const data = await response.json();
    let jsonStr = data.choices[0].message.content;

    jsonStr = jsonStr.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    const parsed = JSON.parse(jsonStr);

    return sanitizeParsedData(parsed);
  } catch (err) {
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
  if (phoneMatch) {
    result.basicInfo.phone = phoneMatch[1];
  }

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    result.basicInfo.email = emailMatch[1];
  }

  const nameBlacklist = ["求职", "简历", "意向", "电话", "邮箱", "自我", "评价", "总结", "个人"];
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(line) && !nameBlacklist.some(b => line.includes(b))) {
      result.basicInfo.name = line;
      break;
    }
  }
  if (!result.basicInfo.name && lines[0]) {
    if (lines[0].length < 8 && !lines[0].includes(":") && !lines[0].includes("：")) {
      result.basicInfo.name = lines[0];
    }
  }

  const titleRegex = /(意向|求职意向|期望职位|岗位|职务|职位|方向)[:：]?\s*([^\n,，|]+)/i;
  const titleMatch = text.match(titleRegex);
  if (titleMatch) {
    result.basicInfo.title = titleMatch[2].trim();
  } else {
    const jobKeywords = ["工程师", "开发", "设计师", "运营", "经理", "产品", "文秘", "选调生", "专员", "教师"];
    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      const line = lines[i];
      if (jobKeywords.some(key => line.includes(key)) && line.length < 15 && !line.includes("经历") && !line.includes("项目")) {
        result.basicInfo.title = line;
        break;
      }
    }
  }

  const skillKeywords = ["技能", "熟悉", "掌握", "精通", "熟练", "精通", "工具", "框架", "语言"];
  const skillLines = [];
  lines.forEach(line => {
    if (skillKeywords.some(keyword => line.includes(keyword)) && line.length > 5 && line.length < 150) {
      let cleaned = line.replace(/^(专业技能|个人技能|熟练掌握|熟悉|精通|掌握)[:：]?\s*/i, "");
      skillLines.push(cleaned);
    }
  });
  if (skillLines.length > 0) {
    result.skills = skillLines.slice(0, 5);
  } else {
    result.skills = ["熟练掌握核心业务技能", "精通所用主流技术", "具备良好的团队协作与沟通能力"];
  }

  let currentSection = "";
  let currentEdu = null;
  let currentExp = null;
  let currentProj = null;
  let summaryLines = [];

  const eduTitles = ["教育", "背景", "学校", "学历"];
  const expTitles = ["工作", "经历", "实践", "职业", "公司"];
  const projTitles = ["项目", "研发", "系统", "开发"];
  const summaryTitles = ["自我", "评价", "个人", "总结"];

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();

    if (eduTitles.some(t => lowerLine.includes(t)) && lowerLine.length < 8) {
      currentSection = "edu";
      return;
    }
    if (expTitles.some(t => lowerLine.includes(t)) && lowerLine.length < 8) {
      currentSection = "exp";
      return;
    }
    if (projTitles.some(t => lowerLine.includes(t)) && lowerLine.length < 8) {
      currentSection = "proj";
      return;
    }
    if (summaryTitles.some(t => lowerLine.includes(t)) && lowerLine.length < 8) {
      currentSection = "summary";
      return;
    }

    if (currentSection === "edu") {
      if (line.includes("大学") || line.includes("学院")) {
        if (currentEdu) result.education.push(currentEdu);

        let degree = "本科";
        if (line.includes("硕士") || line.includes("研究生")) degree = "硕士";
        else if (line.includes("博士")) degree = "博士";
        else if (line.includes("大专") || line.includes("专科")) degree = "大专";

        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?\d{4}[.\-/]\d{2})/);
        const date = dateMatch ? dateMatch[1] : "2020.09 - 2024.06";

        const parts = line.split(/[\s,，|]+/).filter(p => p !== "");
        const school = parts.find(p => p.includes("大学") || p.includes("学院")) || parts[0] || "高等学府";
        const major = parts.find(p => !p.includes("大学") && !p.includes("学院") && !p.includes("硕士") && !p.includes("本科") && !p.includes("博士") && !p.includes("-") && !p.includes(".")) || "相关专业";

        currentEdu = { school, major, degree, date, description: "" };
      } else if (currentEdu) {
        currentEdu.description += (currentEdu.description ? "\n" : "") + line;
      }
    }
    else if (currentSection === "exp") {
      if (line.includes("公司") || line.includes("集团") || line.includes("机构")) {
        if (currentExp) result.experience.push(currentExp);

        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今))/);
        const date = dateMatch ? dateMatch[1] : "2024.07 - 至今";

        const parts = line.split(/[\s,，|]+/).filter(p => p !== "");
        const company = parts.find(p => p.includes("公司") || p.includes("集团")) || parts[0] || "创新企业";
        const role = parts.find(p => !p.includes("公司") && !p.includes("集团") && !p.includes("至今") && !p.includes("-") && !p.includes(".")) || "核心开发人员";

        currentExp = { company, role, date, description: "" };
      } else if (currentExp) {
        currentExp.description += (currentExp.description ? "\n" : "") + line;
      }
    }
    else if (currentSection === "proj") {
      if (line.includes("项目") || line.includes("系统") || line.includes("平台") || line.includes("应用")) {
        if (currentProj) result.projects.push(currentProj);

        const dateMatch = line.match(/(\d{4}[.\-/]\d{2}.*?(?:\d{4}[.\-/]\d{2}|至今))/);
        const date = dateMatch ? dateMatch[1] : "2024.01 - 2024.06";

        const parts = line.split(/[\s,，|]+/).filter(p => p !== "");
        const name = parts.find(p => p.includes("项目") || p.includes("系统") || p.includes("平台") || p.includes("应用")) || parts[0] || "创新研发项目";
        const role = parts.find(p => p !== name && !p.includes("至今") && !p.includes("-") && !p.includes(".")) || "核心成员";

        currentProj = { name, role, date, description: "" };
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

  if (summaryLines.length > 0) {
    result.basicInfo.summary = summaryLines.join("\n");
  } else {
    result.basicInfo.summary = "本人工作认真负责，具有极强的学习和实践能力，擅长在紧凑节奏下高效解决问题。";
  }

  if (result.education.length === 0) {
    result.education.push({ school: "某重点大学", major: "本专业", degree: "学士学位", date: "2020.09 - 2024.06", description: "主修核心课程，表现优异。" });
  }
  if (result.experience.length === 0) {
    result.experience.push({ company: "某领先企业", role: "关键岗", date: "2024.07 - 至今", description: "负责日常核心业务处理。" });
  }
  if (result.projects.length === 0) {
    result.projects.push({ name: "行业大型实践项目", role: "项目组员", date: "2024.01 - 2024.05", description: "参与项目从立项到上线全链路研发。" });
  }

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
