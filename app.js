/**
 * Main Application Logic
 */

const App = {
    // Current state containing all organized cards
    // Structure: Array of { company: string, people: Array }
    data: [],

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadSettings();
        this.render();
    },

    cacheDOM() {
        this.dom = {
            cameraInput: document.getElementById('camera-input'),
            canvasArea: document.getElementById('canvas-area'),
            emptyState: document.getElementById('empty-state'),
            modal: document.getElementById('settings-modal'),
            settingsBtn: document.getElementById('settings-btn'),
            closeModalBtn: document.getElementById('close-modal'),
            saveSettingsBtn: document.getElementById('save-settings'),
            apiKeyInput: document.getElementById('api-key'),
            modelNameInput: document.getElementById('model-name'),
            demoModeInput: document.getElementById('demo-mode'),
            loadingOverlay: document.getElementById('loading-overlay'),
            // Search elements
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search')
        };
    },

    bindEvents() {
        this.dom.cameraInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // New Gallery Input
        const galleryInput = document.getElementById('gallery-input');
        if (galleryInput) {
            galleryInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Modal Events
        this.dom.settingsBtn.addEventListener('click', () => {
            this.dom.modal.classList.add('visible');
            this.dom.modal.classList.remove('hidden');
        });

        this.dom.closeModalBtn.addEventListener('click', () => {
            this.dom.modal.classList.remove('visible');
            setTimeout(() => this.dom.modal.classList.add('hidden'), 200);
        });

        this.dom.saveSettingsBtn.addEventListener('click', () => {
            const key = this.dom.apiKeyInput.value.trim();
            const modelName = this.dom.modelNameInput.value.trim();
            const isDemo = this.dom.demoModeInput.checked;

            window.aiService.setApiKey(key);
            window.aiService.setModelName(modelName);
            window.aiService.setDemoMode(isDemo);

            alert('設定已儲存');
            this.dom.modal.classList.remove('visible');
            setTimeout(() => this.dom.modal.classList.add('hidden'), 200);
        });

        // Search Events
        this.dom.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleSearch(query);
        });

        this.dom.clearSearchBtn.addEventListener('click', () => {
            this.dom.searchInput.value = '';
            this.handleSearch('');
            this.dom.searchInput.focus();
        });
    },

    loadSettings() {
        this.dom.apiKeyInput.value = window.aiService.apiKey;
        this.dom.modelNameInput.value = window.aiService.modelName;
        this.dom.demoModeInput.checked = window.aiService.isDemoMode;
    },

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        this.showLoading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const base64 = await this.readFileAsBase64(files[i]);
                const result = await window.aiService.processImage(base64);
                this.mergeData(result);
            }
            this.render();
            // Reset input so same file can be selected again if needed
            this.dom.cameraInput.value = '';
        } catch (error) {
            alert(`處理失敗: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    },

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Merge new results into existing data (Rule A, B, C)
     */
    mergeData(newResults) {
        if (!Array.isArray(newResults)) return;

        newResults.forEach(newGroup => {
            // Find existing company group
            const existingGroup = this.data.find(g => g.company === newGroup.company);

            if (existingGroup) {
                // Merge people into existing company
                newGroup.people.forEach(newPerson => {
                    const existingPersonIndex = existingGroup.people.findIndex(
                        p => p.name === newPerson.name
                    );

                    if (existingPersonIndex !== -1) {
                        // Update/Overwrite existing person (Rule B: Keep partial logic, here we just overwrite for simplicity or assume better info)
                        existingGroup.people[existingPersonIndex] = newPerson;
                    } else {
                        existingGroup.people.push(newPerson);
                    }
                });
            } else {
                // Add new company group
                this.data.push(newGroup);
            }
        });
    },

    showLoading(show) {
        if (show) {
            this.dom.loadingOverlay.classList.remove('hidden');
        } else {
            this.dom.loadingOverlay.classList.add('hidden');
        }
    },

    handleSearch(query) {
        if (!query) {
            this.dom.clearSearchBtn.classList.add('hidden');
            this.render(this.data); // Render all data
            return;
        }

        this.dom.clearSearchBtn.classList.remove('hidden');
        const lowerQuery = query.toLowerCase();

        // Deep filter logic
        const filteredData = this.data.map(companyGroup => {
            // Check if company name matches
            const companyMatch = (companyGroup.company || '').toLowerCase().includes(lowerQuery);

            if (companyMatch) {
                // If company matches, show all people (or could choose to still filter people, but usually showing all is better context)
                return companyGroup;
            }

            // Filter people within the company
            const matchingPeople = companyGroup.people.filter(person => {
                const nameMatch = (person.name || '').toLowerCase().includes(lowerQuery);
                const titleMatch = (person.title || '').toLowerCase().includes(lowerQuery);
                const emailMatch = (person.email || '').toLowerCase().includes(lowerQuery);
                const addressMatch = (person.address || '').toLowerCase().includes(lowerQuery);

                // Phone is array
                const phoneMatch = (person.phones || []).some(phone =>
                    phone.toLowerCase().includes(lowerQuery)
                );

                return nameMatch || titleMatch || emailMatch || addressMatch || phoneMatch;
            });

            if (matchingPeople.length > 0) {
                return {
                    ...companyGroup,
                    people: matchingPeople
                };
            }

            return null;
        }).filter(group => group !== null);

        this.render(filteredData);
    },

    render(dataToRender = this.data) {
        // Clear current content except empty state
        // (Actually helper to rebuild list)

        if (!dataToRender || dataToRender.length === 0) {
            // Only show empty state if global data is empty (no cards at all)
            if (this.data.length === 0) {
                this.dom.emptyState.style.display = 'flex';
                this.dom.emptyState.querySelector('h2').textContent = '尚未加入名片';
            } else {
                // Search result is empty
                this.dom.emptyState.style.display = 'flex';
                this.dom.emptyState.querySelector('h2').textContent = '找不到相符的結果';
            }

            // Clean up other dynamic elements
            Array.from(this.dom.canvasArea.children).forEach(child => {
                if (child.id !== 'empty-state') child.remove();
            });
            return;
        }

        this.dom.emptyState.style.display = 'none';

        // Re-render all groups
        // Remove old dynamic content
        Array.from(this.dom.canvasArea.children).forEach(child => {
            if (child.id !== 'empty-state') child.remove();
        });

        dataToRender.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'company-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'company-header';
            headerEl.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4h8v4"/>
                </svg>
                ${group.company || 'Unknown Company'}
            `;
            groupEl.appendChild(headerEl);

            group.people.forEach(person => {
                const personEl = document.createElement('div');
                personEl.className = 'person-card';

                let phoneHtml = '';
                if (person.phones && person.phones.length > 0) {
                    phoneHtml = person.phones.map(p => `
                        <li class="contact-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            ${p}
                        </li>
                    `).join('');
                }

                personEl.innerHTML = `
                    <div class="person-name">${person.name || 'Unknown Name'}</div>
                    <div class="person-title">${person.title || ''}</div>
                    <ul class="contact-list">
                        ${phoneHtml}
                        ${person.email ? `
                        <li class="contact-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            ${person.email}
                        </li>
                        ` : ''}
                         ${person.address ? `
                        <li class="contact-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            ${person.address}
                        </li>
                        ` : ''}
                    </ul>
                `;
                groupEl.appendChild(personEl);
            });

            this.dom.canvasArea.appendChild(groupEl);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
