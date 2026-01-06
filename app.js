/**
 * Main Application Logic
 * Refactored to Class structure for stability
 */

class App {
    constructor() {
        // Current state containing all organized cards
        // Structure: Array of { company: string, people: Array }
        this.data = [];
        this.dom = {};
        this.currentEditTarget = null;
        this.currentDuplicates = [];
        this.toastTimeout = null;
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadSettings();
        this.render(); // Render local/empty state first
        this.showLoading(false); // Safety ensure hidden
        this.initFirebase();
    }

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
            // Auth UI
            authModal: document.getElementById('auth-modal'),
            loginBtn: document.getElementById('login-btn'),
            closeAuthBtn: document.getElementById('close-auth-modal'),
            googleLoginBtn: document.getElementById('google-login-btn'),
            emailLoginBtn: document.getElementById('email-login-btn'),
            emailRegisterBtn: document.getElementById('email-register-btn'),
            authEmail: document.getElementById('auth-email'),
            authPassword: document.getElementById('auth-password'),
            // Duplicate Modal
            duplicateModal: document.getElementById('duplicate-modal'),
            duplicateContainer: document.getElementById('duplicate-container'),
            discardAllBtn: document.getElementById('discard-all-btn'),
            keepAllBtn: document.getElementById('keep-all-btn'),
            // Search elements
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search'),
            // Edit Modal
            editModal: document.getElementById('edit-modal'),
            closeEditModalBtn: document.getElementById('close-edit-modal'),
            saveEditBtn: document.getElementById('save-edit-btn'),
            deleteCardBtn: document.getElementById('delete-card-btn'),
            customDupBtn: document.getElementById('check-dup-btn'),
            // Edit Inputs
            editCompanyInput: document.getElementById('edit-company'),
            editNameInput: document.getElementById('edit-name'),
            editTitleInput: document.getElementById('edit-title'),
            editEmailInput: document.getElementById('edit-email'),
            editPhoneInput: document.getElementById('edit-phone'),
            editAddressInput: document.getElementById('edit-address')
        };
    }

    bindEvents() {
        this.dom.cameraInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // New Gallery Input
        const galleryInput = document.getElementById('gallery-input');
        if (galleryInput) {
            galleryInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Check Dup Btn
        if (this.dom.customDupBtn) {
            this.dom.customDupBtn.addEventListener('click', () => {
                this.scanForDuplicates();
            });
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

        // Auth Events
        if (this.dom.loginBtn) {
            this.dom.loginBtn.addEventListener('click', () => {
                this.dom.authModal.classList.remove('hidden');
                this.dom.authModal.classList.add('visible');
            });
        }

        if (this.dom.closeAuthBtn) {
            this.dom.closeAuthBtn.addEventListener('click', () => {
                this.dom.authModal.classList.remove('visible');
                setTimeout(() => this.dom.authModal.classList.add('hidden'), 200);
            });
        }

        if (this.dom.googleLoginBtn) {
            this.dom.googleLoginBtn.addEventListener('click', async () => {
                console.log('Google login clicked'); // Debug
                try {
                    await window.FirebaseService.signInWithGoogle();
                    this.dom.authModal.classList.remove('visible');
                    this.dom.authModal.classList.add('hidden');
                } catch (e) {
                    alert("Google Login Error: " + e.message);
                }
            });
        }

        if (this.dom.emailLoginBtn) {
            this.dom.emailLoginBtn.addEventListener('click', async () => {
                const email = this.dom.authEmail.value;
                const password = this.dom.authPassword.value;
                if (!email || !password) return alert('請輸入 Email 和密碼');

                try {
                    await window.FirebaseService.signInWithEmail(email, password);
                    this.dom.authModal.classList.remove('visible');
                    this.dom.authModal.classList.add('hidden');
                } catch (e) {
                    alert('登入失敗: ' + e.message);
                }
            });
        }

        if (this.dom.emailRegisterBtn) {
            this.dom.emailRegisterBtn.addEventListener('click', async () => {
                const email = this.dom.authEmail.value;
                const password = this.dom.authPassword.value;
                if (!email || !password) return alert('請輸入 Email 和密碼');

                try {
                    await window.FirebaseService.registerWithEmail(email, password);
                    // Usually auto logs in
                    this.dom.authModal.classList.remove('visible');
                    this.dom.authModal.classList.add('hidden');
                } catch (e) {
                    alert('註冊失敗: ' + e.message);
                }
            });
        }

        // Duplicate Modal Events
        this.dom.discardAllBtn.addEventListener('click', () => this.resolveAllDuplicates('discard'));
        this.dom.keepAllBtn.addEventListener('click', () => this.resolveAllDuplicates('keep'));

        // Edit Modal Events
        this.dom.closeEditModalBtn.addEventListener('click', () => this.closeEditModal());
        this.dom.saveEditBtn.addEventListener('click', () => this.saveEditCard());
        this.dom.deleteCardBtn.addEventListener('click', () => this.deleteCurrentCard());
    }

    initFirebase() {
        if (window.FirebaseService) {
            window.FirebaseService.init();
        }
    }

    loadSettings() {
        this.dom.apiKeyInput.value = window.aiService.apiKey;
        this.dom.modelNameInput.value = window.aiService.modelName;
        this.dom.demoModeInput.checked = window.aiService.isDemoMode;
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        this.showLoading(true);

        try {
            let allNewResults = [];
            for (let i = 0; i < files.length; i++) {
                const base64 = await this.readFileAsBase64(files[i]);
                const result = await window.aiService.processImage(base64);
                if (Array.isArray(result)) {
                    allNewResults = allNewResults.concat(result);
                }
            }

            // Identify Duplicates vs Clean Data
            const { cleanData, duplicates } = this.identifyDuplicates(allNewResults);

            // 1. Merge clean data immediately
            if (cleanData.length > 0) {
                this.mergeData(cleanData);
            }

            // 2. If duplicates exist, show modal
            if (duplicates.length > 0) {
                this.currentDuplicates = duplicates; // Store for action
                this.renderDuplicatesModal(duplicates);
            } else {
                this.render(); // If no duplicates, just render
                // Reset input
                this.dom.cameraInput.value = '';
                // Only reset if fully done. If duplicates pending, wait.
            }

            if (duplicates.length === 0) {
                this.dom.cameraInput.value = '';
            }

        } catch (error) {
            alert(`處理失敗: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    identifyDuplicates(newResults) {
        const cleanData = [];
        const duplicates = [];

        newResults.forEach(newGroup => {
            const existingGroup = this.data.find(g =>
                (g.company || '').toLowerCase() === (newGroup.company || '').toLowerCase()
            );

            if (existingGroup) {
                // Check people inside this company
                newGroup.people.forEach(newPerson => {
                    const existingPerson = existingGroup.people.find(p =>
                        (p.name || '').toLowerCase() === (newPerson.name || '').toLowerCase()
                    );

                    if (existingPerson) {
                        // Found duplicate person
                        duplicates.push({
                            companyName: existingGroup.company,
                            existing: existingPerson,
                            new: newPerson,
                            newGroupRaw: newGroup // Ref to structure to rebuild if needed
                        });
                    } else {
                        // New person in existing company
                        cleanData.push({
                            company: existingGroup.company,
                            people: [newPerson]
                        });
                    }
                });
            } else {
                // Totally new company
                cleanData.push(newGroup);
            }
        });

        return { cleanData, duplicates };
    }

    scanForDuplicates() {
        // Global Check across ALL groups
        const duplicates = [];
        const allPeopleMap = {};

        // 1. Flatten and Index everyone by Name
        this.data.forEach(group => {
            group.people.forEach(person => {
                const lowerName = (person.name || '').trim().toLowerCase();
                if (!lowerName) return;

                if (!allPeopleMap[lowerName]) {
                    allPeopleMap[lowerName] = [];
                }

                allPeopleMap[lowerName].push({
                    person: person,
                    group: group
                });
            });
        });

        // 2. Identify Names with > 1 entry
        Object.keys(allPeopleMap).forEach(name => {
            const entries = allPeopleMap[name];
            if (entries.length > 1) {
                // We have duplicates.
                const anchor = entries[0];

                for (let i = 1; i < entries.length; i++) {
                    const candidate = entries[i];
                    duplicates.push({
                        companyName: anchor.group.company,
                        existing: anchor.person,
                        existingGroup: anchor.group,

                        new: candidate.person,
                        newGroup: candidate.group,

                        displayCompanyNameA: anchor.group.company,
                        displayCompanyNameB: candidate.group.company
                    });
                }
            }
        });

        if (duplicates.length > 0) {
            this.currentDuplicates = duplicates;
            this.renderDuplicatesModal(duplicates);
            this.showToast(`發現 ${duplicates.length} 組重複名片`);
        } else {
            this.showToast('未發現重複名片', 'success');
        }
    }

    renderDuplicatesModal(duplicates) {
        this.dom.duplicateContainer.innerHTML = '';

        duplicates.forEach((dup, index) => {
            const el = document.createElement('div');
            el.className = 'duplicate-item';

            let titleHtml = `<div class="duplicate-title">${dup.existing.name}</div>`;
            if (dup.displayCompanyNameA !== dup.displayCompanyNameB) {
                titleHtml += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">
                    ${dup.displayCompanyNameA} <br> vs <br> ${dup.displayCompanyNameB}
                </div>`;
            } else {
                titleHtml += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">
                    ${dup.displayCompanyNameA}
                </div>`;
            }

            el.innerHTML = `
                ${titleHtml}
                <div class="comparison-grid">
                    <div class="comparison-col">
                        <div class="col-header">保留項目 (Keep)</div>
                        ${this.renderPersonDetails(dup.existing)}
                    </div>
                    <div class="comparison-col col-new">
                        <div class="col-header">捨棄/合併項目 (Drop)</div>
                        ${this.renderPersonDetails(dup.new)}
                    </div>
                </div>
                <div class="duplicate-actions">
                    <button class="action-btn-sm btn-discard" onclick="window.App.resolveSingleDuplicate(${index}, 'discard')">直接刪除 (Delete)</button>
                    <button class="action-btn-sm btn-keep" onclick="window.App.resolveSingleDuplicate(${index}, 'keep')">合併並保留左側 (Merge to Left)</button>
                </div>
            `;
            this.dom.duplicateContainer.appendChild(el);
        });

        this.dom.duplicateModal.classList.remove('hidden');
        this.dom.duplicateModal.classList.add('visible');
    }

    renderPersonDetails(person) {
        return `
            <div class="data-row">
                <div class="data-label">職稱</div>
                <div class="data-value">${person.title || '-'}</div>
            </div>
            <div class="data-row">
                <div class="data-label">Email</div>
                <div class="data-value">${person.email || '-'}</div>
            </div>
            <div class="data-row">
                <div class="data-label">電話</div>
                <div class="data-value">${(person.phones || []).join(', ') || '-'}</div>
            </div>
            <div class="data-row">
                <div class="data-label">地址</div>
                <div class="data-value">${person.address || '-'}</div>
            </div>
        `;
    }

    resolveSingleDuplicate(index, action) {
        const dup = this.currentDuplicates[index];
        if (!dup) return;

        if (action === 'keep') {
            this.mergeAndSave(dup.companyName, dup.new);
            // If it was internal duplicate (already in data), after merge we need to ensure the "duplicate" entry is removed
            // mergeAndSave usually updates the existing entry. 
            // In internal duplicate case:
            // "existing" is Person A, "new" is Person B. 
            // mergeAndSave(A, B) -> Updates A with B's info.
            // B still exists in the array?
            // Yes, because we just updated A. B is a separate object in the array.
            // So we must remove B explicitly.

            if (dup.isInternal && dup.groupRef) {
                const pIndex = dup.groupRef.people.indexOf(dup.new);
                if (pIndex !== -1) {
                    dup.groupRef.people.splice(pIndex, 1);
                    // Save the group cleanup immediately
                    window.FirebaseService.saveCardGroup(dup.groupRef);
                }
            }
        } else if (action === 'discard') {
            // Discard "new" means we delete "Person B"
            if (dup.isInternal && dup.groupRef) {
                const pIndex = dup.groupRef.people.indexOf(dup.new);
                if (pIndex !== -1) {
                    dup.groupRef.people.splice(pIndex, 1);
                    window.FirebaseService.saveCardGroup(dup.groupRef);
                }
            }
        }

        // Remove from UI
        this.currentDuplicates[index] = null; // Mark handled

        // Re-render modal or close if empty
        const remaining = this.currentDuplicates.filter(d => d !== null);

        if (remaining.length === 0) {
            this.closeDuplicateModal();
        } else {
            // Hide the specific item visually
            const items = this.dom.duplicateContainer.children;
            if (items[index]) items[index].style.display = 'none';
        }
    }

    resolveAllDuplicates(action) {
        if (action === 'keep') {
            this.currentDuplicates.filter(d => d !== null).forEach(dup => {
                this.mergeAndSave(dup.companyName, dup.new);
            });
        }
        this.closeDuplicateModal();
    }

    closeDuplicateModal() {
        this.dom.duplicateModal.classList.remove('visible');
        setTimeout(() => {
            this.dom.duplicateModal.classList.add('hidden');
            this.render(); // update view with any changes
            this.dom.cameraInput.value = '';
        }, 200);
        this.currentDuplicates = [];
    }

    // --- Edit Feature Logic ---

    openEditModal(person, companyGroup, groupIndex, personIndex) {
        this.currentEditTarget = {
            groupIndex,
            personIndex,
            originalCompany: companyGroup.company
        };

        // Fill inputs
        this.dom.editCompanyInput.value = companyGroup.company || '';
        this.dom.editNameInput.value = person.name || '';
        this.dom.editTitleInput.value = person.title || '';
        this.dom.editEmailInput.value = person.email || '';
        this.dom.editPhoneInput.value = (person.phones || []).join(', ');
        this.dom.editAddressInput.value = person.address || '';

        this.dom.editModal.classList.remove('hidden');
        this.dom.editModal.classList.add('visible');
    }

    closeEditModal() {
        this.dom.editModal.classList.remove('visible');
        setTimeout(() => this.dom.editModal.classList.add('hidden'), 200);
        this.currentEditTarget = null;
    }

    async saveEditCard() {
        if (!this.currentEditTarget) return;

        const { groupIndex, personIndex, originalCompany } = this.currentEditTarget;

        // 1. Construct new person object
        const newPerson = {
            name: this.dom.editNameInput.value.trim(),
            title: this.dom.editTitleInput.value.trim(),
            email: this.dom.editEmailInput.value.trim(),
            phones: this.dom.editPhoneInput.value.split(/[,，]/).map(p => p.trim()).filter(p => p),
            address: this.dom.editAddressInput.value.trim()
        };

        const newCompanyName = this.dom.editCompanyInput.value.trim();

        this.showLoading(true);
        try {
            // Logic differs if company name changed
            if (newCompanyName !== originalCompany) {
                // Move logic: Delete from old group, Add to new/existing group

                // Remove from old
                await this.removePersonFromGroup(originalCompany, personIndex);

                // Add to new
                await this.mergeAndSave(newCompanyName, newPerson);
            } else {
                // Same company, just update person
                // Find group by searching data or assume index is stable (safer to find by company name)
                const group = this.data.find(g => g.company === originalCompany);
                if (group) {
                    group.people[personIndex] = newPerson;
                    await window.FirebaseService.saveCardGroup(group);
                }
            }

            this.closeEditModal();
            // Render will happen via sync listener
        } catch (e) {
            alert('儲存失敗: ' + e.message);
            console.error(e);
        } finally {
            this.showLoading(false);
        }
    }

    async deleteCurrentCard() {
        if (!this.currentEditTarget) return;
        if (!confirm('確定要刪除這張名片嗎？')) return;

        const { personIndex, originalCompany } = this.currentEditTarget;

        this.showLoading(true);
        try {
            await this.removePersonFromGroup(originalCompany, personIndex);
            this.closeEditModal();
        } catch (e) {
            alert('刪除失敗: ' + e.message);
        } finally {
            this.showLoading(false);
        }
    }

    async removePersonFromGroup(companyName, personIndex) {
        const group = this.data.find(g => g.company === companyName);
        if (!group) return;

        // Remove person locally
        group.people.splice(personIndex, 1);

        if (group.people.length === 0) {
            // If group empty, delete updated group doc
            await window.FirebaseService.deleteGroup(group.id);
            // Also remove from local data to maintain consistency until sync
            const idx = this.data.findIndex(g => g.company === companyName);
            if (idx !== -1) this.data.splice(idx, 1);
        } else {
            // Update group with remaining people
            await window.FirebaseService.saveCardGroup(group);
        }
    }

    /**
     * Merge new results into existing data (Rule A, B, C)
     * AND Save to Cloud
     */
    async mergeData(newResults) {
        if (!Array.isArray(newResults)) return;

        // Use a loop to handle async saves
        for (const newGroup of newResults) {
            // Find existing company group (Case Insensitive Match)
            const existingGroup = this.data.find(g =>
                (g.company || '').trim().toLowerCase() === (newGroup.company || '').trim().toLowerCase()
            );

            if (existingGroup) {
                // Merge people into existing company logic
                // We need to clone to modify
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

                // Update implementation
                existingGroup.people = people;

                // Save to cloud
                await window.FirebaseService.saveCardGroup(existingGroup);

            } else {
                // Add new company group
                this.data.push(newGroup);
                // Save to cloud
                await window.FirebaseService.saveCardGroup(newGroup);
            }
        }
    }

    // Helper to merge single person and save
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

    showLoading(show) {
        if (show) {
            this.dom.loadingOverlay.classList.remove('hidden');
        } else {
            this.dom.loadingOverlay.classList.add('hidden');
        }
    }

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
    }

    render(dataToRender = this.data) {
        // Clear current content except empty state
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
                    <div class="card-edit-btn-wrapper">
                         <div class="person-name">${person.name || 'Unknown Name'}</div>
                         <button class="icon-btn edit-icon-btn" aria-label="編輯">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                         </button>
                    </div >
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

                // Add click listener to edit button
                const editBtn = personEl.querySelector('.edit-icon-btn');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent other clicks
                    const pIndex = group.people.indexOf(person);
                    // Find group index in main data (crucial for logic)
                    const gIndex = this.data.findIndex(g => g.company === group.company);

                    this.openEditModal(person, group, gIndex, pIndex);
                });

                groupEl.appendChild(personEl);
            });

            this.dom.canvasArea.appendChild(groupEl);
        });
    }

    showToast(message, type = 'success') {
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${message}</span>
        `;

        // Force reflow
        void toast.offsetWidth;
        toast.classList.add('visible');

        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }
}

// Instantiate and expose globally
const app = new App();
window.App = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
