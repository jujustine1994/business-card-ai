/**
 * ============================================================================
 *  MODULE: App Coordinator
 *  RESPONSIBILITY: Central State, Initialization, and Manager Orchestration
 * ============================================================================
 */
class App {
    constructor() {
        this.data = [
            {
                company: "蹦挖娛樂",
                people: [
                    {
                        name: "張O航",
                        title: "董事長",
                        email: "Example@example.tw",
                        phones: ["(02) 87878787"],
                        address: "台北市信義區",
                        note: "測試資料，若有新增資料即會刪除"
                    }
                ]
            }
        ];
        this.dom = {
            loadingOverlay: document.getElementById('loading-overlay'),
            canvasArea: document.getElementById('canvas-area'),
            emptyState: document.getElementById('empty-state'),
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search'),

            // Settings DOM
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettingsBtn: document.getElementById('close-modal'),
            saveSettingsBtn: document.getElementById('save-settings'),
            apiKeyInput: document.getElementById('api-key'),
            modelNameInput: document.getElementById('model-name'),
            demoModeInput: document.getElementById('demo-mode')
        };

        // Initialize Managers
        this.authManager = new AuthManager(this);
        this.scanManager = new ScanManager(this);
        this.duplicateManager = new DuplicateManager(this);
        this.editManager = new EditManager(this);
    }

    init() {
        this.bindGlobalEvents();
        this.loadSettings();
        this.render();
        this.showLoading(false);
        this.initFirebase();
    }

    bindGlobalEvents() {
        // Search
        this.dom.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value.trim()));
        this.dom.clearSearchBtn.addEventListener('click', () => {
            this.dom.searchInput.value = '';
            this.handleSearch('');
            this.dom.searchInput.focus();
        });

        // Settings Modal
        this.dom.settingsBtn.addEventListener('click', () => {
            this.dom.settingsModal.classList.add('visible');
            this.dom.settingsModal.classList.remove('hidden');
        });

        this.dom.closeSettingsBtn.addEventListener('click', () => {
            this.dom.settingsModal.classList.remove('visible');
            setTimeout(() => this.dom.settingsModal.classList.add('hidden'), 200);
        });

        this.dom.saveSettingsBtn.addEventListener('click', () => {
            const key = this.dom.apiKeyInput.value.trim();
            const modelName = this.dom.modelNameInput.value.trim();
            const isDemo = this.dom.demoModeInput.checked;

            window.aiService.setApiKey(key);
            window.aiService.setModelName(modelName);
            window.aiService.setDemoMode(isDemo);

            alert('設定已儲存');
            this.dom.settingsModal.classList.remove('visible');
            setTimeout(() => this.dom.settingsModal.classList.add('hidden'), 200);
        });
    }

    initFirebase() {
        if (window.FirebaseService) {
            window.FirebaseService.init();
        }
    }

    loadSettings() {
        if (window.aiService) {
            this.dom.apiKeyInput.value = window.aiService.apiKey;
            this.dom.modelNameInput.value = window.aiService.modelName;
            this.dom.demoModeInput.checked = window.aiService.isDemoMode;
        }
    }

    // --- Core Data Handling ---

    handleScanResults(newResults) {
        const { cleanData, duplicates } = this.duplicateManager.identifyDuplicates(newResults, this.data);

        // 1. Merge clean data immediately
        if (cleanData.length > 0) {
            this.mergeData(cleanData);
        }

        // 2. If duplicates, hand over to DuplicateManager
        if (duplicates.length > 0) {
            this.duplicateManager.handleNewDuplicates(duplicates);
        } else {
            this.render();
        }
    }

    async mergeData(newResults) {
        if (!Array.isArray(newResults)) return;

        for (const newGroup of newResults) {
            const existingGroup = this.data.find(g =>
                (g.company || '').trim().toLowerCase() === (newGroup.company || '').trim().toLowerCase()
            );

            if (existingGroup) {
                // Merge people
                const people = [...existingGroup.people];
                newGroup.people.forEach(newPerson => {
                    const existingPersonIndex = people.findIndex(
                        p => (p.name || '').toLowerCase() === (newPerson.name || '').toLowerCase()
                    );
                    if (existingPersonIndex !== -1) {
                        people[existingPersonIndex] = newPerson;
                    } else {
                        people.push(newPerson);
                    }
                });
                existingGroup.people = people;
                await window.FirebaseService.saveCardGroup(existingGroup);
            } else {
                this.data.push(newGroup);
                await window.FirebaseService.saveCardGroup(newGroup);
            }
        }
    }

    // Helper for EditManager to save changes
    async mergeAndSave(companyName, newPerson) {
        const existingGroup = this.data.find(g => g.company === companyName);
        if (existingGroup) {
            const people = [...existingGroup.people];
            const idx = people.findIndex(p => p.name === newPerson.name);
            if (idx !== -1) people[idx] = newPerson;
            else people.push(newPerson);
            existingGroup.people = people;
            await window.FirebaseService.saveCardGroup(existingGroup);
        } else {
            const newGroup = { company: companyName, people: [newPerson] };
            await window.FirebaseService.saveCardGroup(newGroup);
        }
    }

    async removePersonFromGroup(companyName, personIndex) {
        const group = this.data.find(g => g.company === companyName);
        if (!group) return;

        group.people.splice(personIndex, 1);

        if (group.people.length === 0) {
            await window.FirebaseService.deleteGroup(group.id);
            const idx = this.data.findIndex(g => g.company === companyName);
            if (idx !== -1) this.data.splice(idx, 1);
        } else {
            await window.FirebaseService.saveCardGroup(group);
        }
    }

    // --- UI Utilities ---

    showLoading(show) {
        if (this.dom.loadingOverlay) {
            if (show) this.dom.loadingOverlay.classList.remove('hidden');
            else this.dom.loadingOverlay.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Transition
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    handleSearch(query) {
        if (!query) {
            this.dom.clearSearchBtn.classList.add('hidden');
            this.render(this.data);
            return;
        }

        this.dom.clearSearchBtn.classList.remove('hidden');
        const lowerQuery = query.toLowerCase();

        const filteredData = this.data.map(companyGroup => {
            const companyMatch = (companyGroup.company || '').toLowerCase().includes(lowerQuery);
            if (companyMatch) return companyGroup;

            const matchingPeople = companyGroup.people.filter(person => {
                const nameMatch = (person.name || '').toLowerCase().includes(lowerQuery);
                const titleMatch = (person.title || '').toLowerCase().includes(lowerQuery);
                const emailMatch = (person.email || '').toLowerCase().includes(lowerQuery);
                const addressMatch = (person.address || '').toLowerCase().includes(lowerQuery);
                const noteMatch = (person.note || '').toLowerCase().includes(lowerQuery);
                const phoneMatch = (person.phones || []).some(phone =>
                    phone.toLowerCase().includes(lowerQuery)
                );

                return nameMatch || titleMatch || emailMatch || addressMatch || phoneMatch || noteMatch;
            });

            if (matchingPeople.length > 0) {
                return { ...companyGroup, people: matchingPeople };
            }
            return null;
        }).filter(group => group !== null);

        this.render(filteredData);
    }

    render(dataToRender = this.data) {
        const area = this.dom.canvasArea;
        // Clean children except empty state
        Array.from(area.children).forEach(child => {
            if (child.id !== 'empty-state') child.remove();
        });

        if (!dataToRender || dataToRender.length === 0) {
            if (this.data.length === 0) {
                this.dom.emptyState.style.display = 'flex';
                this.dom.emptyState.querySelector('h2').textContent = '尚未加入名片';
            } else {
                this.dom.emptyState.style.display = 'flex';
                this.dom.emptyState.querySelector('h2').textContent = '找不到相符的結果';
            }
            return;
        }

        this.dom.emptyState.style.display = 'none';

        dataToRender.forEach((group, gIndex) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'company-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'company-header';
            headerEl.textContent = group.company || '未命名公司';
            groupEl.appendChild(headerEl);

            const gridEl = document.createElement('div');
            gridEl.className = 'cards-grid';

            group.people.forEach((person, pIndex) => {
                const cardEl = document.createElement('div');
                cardEl.className = 'business-card';
                cardEl.onclick = () => this.editManager.openEditModal(person, group, gIndex, pIndex);

                cardEl.innerHTML = `
                    <div class="card-edit-indicator">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </div>
                    <div class="card-name">${person.name || '未命名'}</div>
                    <div class="card-title">${person.title || ''}</div>
                    <div class="card-details">
                        ${person.email ? `<div>📧 ${person.email}</div>` : ''}
                        ${(person.phones && person.phones.length > 0) ? `<div>📞 ${person.phones[0]}</div>` : ''}
                        ${person.address ? `<div>📍 ${person.address}</div>` : ''}
                        ${person.note ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1); color: var(--accent-color); font-size: 0.85rem;">📝 ${person.note}</div>` : ''}
                    </div>
                `;
                gridEl.appendChild(cardEl);
            });

            groupEl.appendChild(gridEl);
            area.appendChild(groupEl);
        });
    }

    renderPersonDetails(person) {
        let noteHtml = '';
        if (person.note) {
            noteHtml = `<div class="data-row"><div class="data-label">備註</div><div class="data-value" style="white-space: pre-wrap;">${person.note}</div></div>`;
        }
        return `
            <div class="data-row"><div class="data-label">職稱</div><div class="data-value">${person.title || '-'}</div></div>
            <div class="data-row"><div class="data-label">Email</div><div class="data-value">${person.email || '-'}</div></div>
            <div class="data-row"><div class="data-label">電話</div><div class="data-value">${(person.phones || []).join(', ') || '-'}</div></div>
            <div class="data-row"><div class="data-label">地址</div><div class="data-value">${person.address || '-'}</div></div>
            ${noteHtml}
        `;
    }
}
