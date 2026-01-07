/**
 * ============================================================================
 *  MODULE: Duplicate Manager
 *  RESPONSIBILITY: Conflict Detection & Resolution Logic
 * ============================================================================
 */
class DuplicateManager {
    constructor(app) {
        this.app = app;
        this.currentDuplicates = [];
        this.modifiedGroups = new Set();
        this.dataBackup = null;

        this.dom = {
            duplicateModal: document.getElementById('duplicate-modal'),
            duplicateContainer: document.getElementById('duplicate-container'),
            saveDupsBtn: document.getElementById('save-dups-btn'),
            cancelDupsBtn: document.getElementById('cancel-dups-btn'),
            customDupBtn: document.getElementById('check-dup-btn') // "檢查重複" button
        };
        this.bindEvents();
    }

    bindEvents() {
        if (this.dom.saveDupsBtn) {
            this.dom.saveDupsBtn.addEventListener('click', () => this.saveDuplicateResolution());
        }
        if (this.dom.cancelDupsBtn) {
            this.dom.cancelDupsBtn.addEventListener('click', () => this.cancelDuplicateResolution());
        }
        if (this.dom.customDupBtn) {
            this.dom.customDupBtn.addEventListener('click', () => this.scanForDuplicates());
        }
    }

    identifyDuplicates(newResults, currentData) {
        const cleanData = [];
        const duplicates = [];

        newResults.forEach(newGroup => {
            const existingGroup = currentData.find(g =>
                (g.company || '').toLowerCase() === (newGroup.company || '').toLowerCase()
            );

            if (existingGroup) {
                newGroup.people.forEach(newPerson => {
                    const existingPerson = existingGroup.people.find(p =>
                        (p.name || '').toLowerCase() === (newPerson.name || '').toLowerCase()
                    );

                    if (existingPerson) {
                        duplicates.push({
                            companyName: existingGroup.company,
                            existing: existingPerson,
                            existingGroup: existingGroup,
                            new: newPerson,
                            newGroupRaw: newGroup
                        });
                    } else {
                        cleanData.push({
                            company: existingGroup.company,
                            people: [newPerson]
                        });
                    }
                });
            } else {
                cleanData.push(newGroup);
            }
        });

        return { cleanData, duplicates };
    }

    // Manual Scan Triggered by User
    scanForDuplicates() {
        console.log('Starting scanForDuplicates');
        this.dataBackup = JSON.parse(JSON.stringify(this.app.data));
        this.modifiedGroups = new Set();

        const duplicates = [];
        const allPeopleMap = {};

        // 1. Flatten
        this.app.data.forEach(group => {
            group.people.forEach(person => {
                const lowerName = (person.name || '').trim().toLowerCase();
                if (!lowerName) return;

                if (!allPeopleMap[lowerName]) allPeopleMap[lowerName] = [];

                allPeopleMap[lowerName].push({
                    person: person,
                    group: group
                });
            });
        });

        // 2. Identify
        Object.keys(allPeopleMap).forEach(name => {
            const entries = allPeopleMap[name];
            if (entries.length > 1) {
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
            this.app.showToast(`發現 ${duplicates.length} 組重複`);
        } else {
            this.app.showToast('未發現重複名片', 'success');
        }
    }

    renderDuplicatesModal(duplicates) {
        this.dom.duplicateContainer.innerHTML = '';
        duplicates.forEach((dup, index) => {
            if (!dup) return; // Skip if null
            const el = document.createElement('div');
            el.className = 'duplicate-item';

            let titleHtml = `<div class="duplicate-title">${dup.existing.name}</div>`;
            if (dup.displayCompanyNameA && dup.displayCompanyNameB && dup.displayCompanyNameA !== dup.displayCompanyNameB) {
                titleHtml += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">
                    ${dup.displayCompanyNameA} <br> vs <br> ${dup.displayCompanyNameB}
                </div>`;
            } else {
                const comp = dup.displayCompanyNameA || dup.companyName || '';
                titleHtml += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">${comp}</div>`;
            }

            el.innerHTML = `
                ${titleHtml}
                <div class="comparison-grid">
                    <div class="comparison-col">
                        <div class="col-header">保留項目 (Keep)</div>
                        ${this.app.renderPersonDetails(dup.existing)}
                    </div>
                    <div class="comparison-col col-new">
                        <div class="col-header">捨棄/合併項目 (Drop)</div>
                        ${this.app.renderPersonDetails(dup.new)}
                    </div>
                </div>
                <div class="duplicate-actions">
                    <button class="action-btn-sm btn-discard" onclick="window.businessCardApp.duplicateManager.resolveSingleDuplicate(${index}, 'discard')">直接刪除 (Delete)</button>
                    <button class="action-btn-sm btn-keep" onclick="window.businessCardApp.duplicateManager.resolveSingleDuplicate(${index}, 'keep')">合併並保留左側 (Merge)</button>
                </div>
            `;
            this.dom.duplicateContainer.appendChild(el);
        });
        this.dom.duplicateModal.classList.remove('hidden');
        this.dom.duplicateModal.classList.add('visible');
    }

    resolveSingleDuplicate(index, action) {
        const dup = this.currentDuplicates[index];
        if (!dup) return;

        if (action === 'keep') {
            const combinedPerson = { ...dup.existing };
            // Combine Logic
            const phones = new Set([...(dup.existing.phones || []), ...(dup.new.phones || [])]);
            combinedPerson.phones = Array.from(phones);
            if (!combinedPerson.title) combinedPerson.title = dup.new.title;
            if (!combinedPerson.email) combinedPerson.email = dup.new.email;
            if (!combinedPerson.address) combinedPerson.address = dup.new.address;
            if (!combinedPerson.note) combinedPerson.note = dup.new.note;

            const groupA = dup.existingGroup;
            // Update in place
            Object.assign(dup.existing, combinedPerson);
            this.modifiedGroups.add(groupA);

            const groupB = dup.newGroup;
            // Assuming we aren't handling the same person object in same group case weirdly
            // But if A and B are different entries
            const pIndexB = groupB.people.indexOf(dup.new);
            if (pIndexB !== -1) {
                groupB.people.splice(pIndexB, 1);
                this.modifiedGroups.add(groupB);
            }

        } else if (action === 'discard') {
            const groupB = dup.newGroup;
            const pIndexB = groupB.people.indexOf(dup.new);
            if (pIndexB !== -1) {
                groupB.people.splice(pIndexB, 1);
                this.modifiedGroups.add(groupB);
            }
        }

        this.currentDuplicates[index] = null;
        // Visual hide
        const items = this.dom.duplicateContainer.children;
        if (items[index]) items[index].style.display = 'none';
    }

    async saveDuplicateResolution() {
        if (this.modifiedGroups.size === 0) {
            this.closeDuplicateModal();
            return;
        }

        this.app.showLoading(true);
        try {
            const promises = [];
            this.modifiedGroups.forEach(group => {
                if (group.people.length === 0) {
                    promises.push(window.FirebaseService.deleteGroup(group.id));
                    const idx = this.app.data.indexOf(group);
                    if (idx !== -1) this.app.data.splice(idx, 1);
                } else {
                    promises.push(window.FirebaseService.saveCardGroup(group));
                }
            });

            await Promise.all(promises);
            this.app.showToast('變更已永久儲存');
            this.dataBackup = null;
            this.closeDuplicateModal();
        } catch (e) {
            alert('儲存失敗: ' + e.message);
            console.error(e);
        } finally {
            this.app.showLoading(false);
            this.modifiedGroups.clear();
        }
    }

    cancelDuplicateResolution() {
        console.log('Cancelling resolution...');
        if (this.dataBackup) {
            // Restore from backup
            this.app.data = JSON.parse(JSON.stringify(this.dataBackup));
            this.dataBackup = null;
        }
        this.modifiedGroups.clear();
        this.closeDuplicateModal();
        this.app.render();
        this.app.showToast('已取消變更');
    }

    closeDuplicateModal() {
        this.dom.duplicateModal.classList.remove('visible');
        setTimeout(() => {
            this.dom.duplicateModal.classList.add('hidden');
            this.app.render();
        }, 200);
        this.currentDuplicates = [];
    }

    // For handling incoming scan duplicates
    handleNewDuplicates(duplicates) {
        this.currentDuplicates = duplicates;
        this.dataBackup = JSON.parse(JSON.stringify(this.app.data)); // Backup current state
        this.modifiedGroups = new Set();
        this.renderDuplicatesModal(duplicates);
    }
}
