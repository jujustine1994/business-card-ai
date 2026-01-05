/**
 * AI Service Module
 * Handles API calls to Gemini and Mock Data generation
 */

// User-Defined System Prompt
const SYSTEM_PROMPT = `
# Role
你是一位專精於「商業名片辨識」與「結構化資料建檔」的 AI 助手。你擁有高精準度的 OCR 能力，並具備資料歸納邏輯，能將包含「多張名片」的影像資訊轉換為整潔、邏輯清晰的資料庫。

# Context
使用者將會上傳一張或多張包含「多張名片」的照片（例如把五張名片排在桌上拍成一張照片）。
**Critical Instruction**: 一張照片中可能包含多個不相關的名片。你必須辨識照片中的「每一個」名片區塊，不可只辨識一張就停止。

# Goals
1. **全面辨識**：找出圖片中所有的名片，無論排列方式為何。
2. **精準提取**：提取關鍵聯絡資訊。
3. **嚴格過濾**：剔除名片背面、Logo、非名片物體。
4. **邏輯歸戶**：將所有辨識出的名片依照「公司」進行分組。

# Workflow
## Step 1: 影像掃描 (Multi-Detection)
- 掃描圖片全域，標記出所有疑似名片的矩形區塊。
- 對每一個區塊進行獨立分析。
- **過濾機制**：忽略背面、單純圖案與背景雜物。

## Step 2: 關鍵資訊擷取 (Extraction)
針對「每一個」有效名片，擷取以下欄位：
1. **公司名稱** (Company)
2. **姓名** (Name)
3. **職稱** (Job Title)
4. **地址** (Address)
5. **電話號碼** (Phone)：包含手機、市話與分機。
6. **電子郵件** (Email)

## Output Format
請輸出純 JSON 格式，不要包含 Markdown block (no \`\`\`json)。
格式如下：
[
  {
    "company": "Company Name",
    "people": [
      {
        "name": "Name",
        "title": "Job Title",
        "phones": ["Phone 1", "Phone 2"],
        "email": "Email",
        "address": "Address"
      }
    ]
  },
  {
    "company": "Another Company",
    "people": [...]
  }
]
`;

const MockData = [
    {
        company: "Google DeepMind",
        people: [
            {
                name: "Demis Hassabis",
                title: "CEO",
                phones: ["+44 20 7031 3000"],
                email: "demis@deepmind.com",
                address: "King's Cross, London"
            },
            {
                name: "Shane Gu",
                title: "Research Scientist",
                phones: ["+1 650 253 0000"],
                email: "shanegu@google.com",
                address: "Mountain View, CA"
            }
        ]
    },
    {
        company: "OpenAI",
        people: [
            {
                name: "Sam Altman",
                title: "CEO",
                phones: ["+1 415 555 0123"],
                email: "sam@openai.com",
                address: "San Francisco, CA"
            }
        ]
    }
];

class AIService {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.isDemoMode = localStorage.getItem('is_demo_mode') === 'true';
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    setDemoMode(enabled) {
        this.isDemoMode = enabled;
        localStorage.setItem('is_demo_mode', enabled);
    }

    async processImage(base64Image) {
        if (this.isDemoMode) {
            console.log("Running in Demo Mode");
            await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay
            return MockData;
        }

        if (!this.apiKey) {
            throw new Error("請先設定 API Key，或開啟演示模式。");
        }

        // Remove header if present (e.g., "data:image/jpeg;base64,")
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: cleanBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json"
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "API 請求失敗");
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return JSON.parse(text);

        } catch (error) {
            console.error("AI Processing Error:", error);
            throw error;
        }
    }
}

window.aiService = new AIService();
