/**
 * ============================================================================
 *  MODULE: Edit Manager
 *  RESPONSIBILITY: Handling Edit/Delete Modal and Updates
 * ============================================================================
 */
class EditManager {
    constructor(app) {
        this.app = app;
        this.currentEditTarget = null;
        this.dom = {
            editModal: document.getElementById('edit-modal'),
            closeEditModalBtn: document.getElementById('close-edit-modal-btn'),
            saveEditBtn: document.getElementById('save-edit-btn'),
            deleteCardBtn: document.getElementById('delete-card-btn'),
            inputs: {
                company: document.getElementById('edit-company'),
                name: document.getElementById('edit-name'),
                title: document.getElementById('edit-title'),
                email: document.getElementById('edit-email'),
                phone: document.getElementById('edit-phone'),
                address: document.getElementById('edit-address'),
                note: document.getElementById('edit-note')
            }
        };
        this.bindEvents();
    }

    bindEvents() {
        if (this.dom.closeEditModalBtn) {
            this.dom.closeEditModalBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (this.dom.saveEditBtn) {
            this.dom.saveEditBtn.addEventListener('click', () => this.saveEditCard());
        }
        if (this.dom.deleteCardBtn) {
            this.dom.deleteCardBtn.addEventListener('click', () => this.deleteCurrentCard());
        }
    }

    openEditModal(person, companyGroup, groupIndex, personIndex) {
        this.currentEditTarget = {
            groupIndex,
            personIndex,
            originalCompany: companyGroup.company,
        };

        const d = this.dom.inputs;
        d.company.value = companyGroup.company || '';
        d.name.value = person.name || '';
        d.title.value = person.title || '';
        d.email.value = person.email || '';
        d.phone.value = (person.phones || []).join(', ');
        d.address.value = person.address || '';
        d.note.value = person.note || '';

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

        const { personIndex, originalCompany } = this.currentEditTarget;
        const d = this.dom.inputs;

        const newPerson = {
            name: d.name.value.trim(),
            title: d.title.value.trim(),
            email: d.email.value.trim(),
            phones: d.phone.value.split(/[,，]/).map(p => p.trim()).filter(p => p),
            address: d.address.value.trim(),
            note: d.note.value.trim()
        };

        const newCompanyName = d.company.value.trim();

        this.app.showLoading(true);
        try {
            if (newCompanyName !== originalCompany) {
                // Remove from old
                await this.app.removePersonFromGroup(originalCompany, personIndex);
                // Add to new
                await this.app.mergeAndSave(newCompanyName, newPerson);
            } else {
                // Update in place
                const group = this.app.data.find(g => g.company === originalCompany);
                if (group) {
                    group.people[personIndex] = newPerson;
                    await window.FirebaseService.saveCardGroup(group);
                }
            }
            this.closeEditModal();
        } catch (e) {
            alert('儲存失敗: ' + e.message);
            console.error(e);
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteCurrentCard() {
        if (!this.currentEditTarget) return;
        if (!confirm('確定要刪除這張名片嗎？')) return;

        const { personIndex, originalCompany } = this.currentEditTarget;

        this.app.showLoading(true);
        try {
            await this.app.removePersonFromGroup(originalCompany, personIndex);
            this.closeEditModal();
        } catch (e) {
            alert('刪除失敗: ' + e.message);
        } finally {
            this.app.showLoading(false);
        }
    }
}
