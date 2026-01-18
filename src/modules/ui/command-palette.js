/**
 * Command Palette UI Component
 *
 * A modal overlay for searching and selecting SQL templates.
 * Triggered by Ctrl/Cmd+K or button click.
 */

import {
    getTemplatesForPalette,
    getAllTemplatesWithStatus,
    searchTemplates,
    CATEGORIES
} from '../templates/index.js';

/**
 * CommandPalette class
 * Manages the command palette modal UI
 */
export class CommandPalette {
    /**
     * @param {Function} onSelect - Callback when a template is selected: (sql) => void
     * @param {Function} getMappedTables - Function that returns current mapped table Set
     */
    constructor(onSelect, getMappedTables) {
        this.onSelect = onSelect;
        this.getMappedTables = getMappedTables;
        this.isOpen = false;
        this.selectedIndex = 0;
        this.filteredTemplates = [];
        this.showUnavailable = false;

        this._createDOM();
        this._setupEventListeners();
    }

    /**
     * Create the DOM elements for the command palette
     * @private
     */
    _createDOM() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'command-palette-overlay';
        this.overlay.innerHTML = `
            <div class="command-palette">
                <div class="command-palette-header">
                    <input type="text" class="command-palette-input" placeholder="Search templates..." autofocus>
                    <label class="command-palette-toggle">
                        <input type="checkbox" class="show-unavailable-checkbox">
                        <span>Show locked</span>
                    </label>
                </div>
                <div class="command-palette-results"></div>
                <div class="command-palette-footer">
                    <span class="command-palette-hint">
                        <kbd>↑↓</kbd> Navigate
                        <kbd>Enter</kbd> Select
                        <kbd>Esc</kbd> Close
                    </span>
                </div>
            </div>
        `;

        // Get references
        this.input = this.overlay.querySelector('.command-palette-input');
        this.results = this.overlay.querySelector('.command-palette-results');
        this.showUnavailableCheckbox = this.overlay.querySelector('.show-unavailable-checkbox');

        // Add to document but hidden
        document.body.appendChild(this.overlay);
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Input handling
        this.input.addEventListener('input', () => {
            this._updateResults();
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this._handleKeydown(e);
        });

        // Show unavailable toggle
        this.showUnavailableCheckbox.addEventListener('change', (e) => {
            this.showUnavailable = e.target.checked;
            this._updateResults();
        });

        // Global keyboard shortcut (Ctrl/Cmd+K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }

            // Close on Escape
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Handle keyboard navigation
     * @private
     */
    _handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                this._selectCurrent();
                break;
            case 'Escape':
                this.close();
                break;
        }
    }

    /**
     * Update the results list based on search query
     * @private
     */
    _updateResults() {
        const query = this.input.value;
        const mappedTables = this.getMappedTables();

        this.filteredTemplates = searchTemplates(query, mappedTables, this.showUnavailable);

        // Reset selection
        this.selectedIndex = 0;

        // Render results
        this._renderResults();
    }

    /**
     * Render the results list
     * @private
     */
    _renderResults() {
        if (this.filteredTemplates.length === 0) {
            this.results.innerHTML = `
                <div class="command-palette-empty">
                    ${this.showUnavailable
                        ? 'No templates found'
                        : 'No available templates. Upload required tables or check "Show locked".'}
                </div>
            `;
            return;
        }

        // Group by category
        const grouped = {};
        for (const template of this.filteredTemplates) {
            const category = template.category || 'other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(template);
        }

        let html = '';
        let globalIndex = 0;

        for (const [categoryId, templates] of Object.entries(grouped)) {
            const category = CATEGORIES.find(c => c.id === categoryId) || { label: categoryId };

            html += `<div class="command-palette-category">${category.label}</div>`;

            for (const template of templates) {
                const isSelected = globalIndex === this.selectedIndex;
                const unavailableClass = !template.available ? 'unavailable' : '';
                const selectedClass = isSelected ? 'selected' : '';

                html += `
                    <div class="command-palette-item ${selectedClass} ${unavailableClass}"
                         data-index="${globalIndex}"
                         data-id="${template.id}">
                        <div class="command-palette-item-title">${template.title}</div>
                        <div class="command-palette-item-description">${template.description}</div>
                        ${!template.available
                            ? `<div class="command-palette-item-locked">Requires: ${template.missingDependencies.join(', ')}</div>`
                            : ''}
                    </div>
                `;
                globalIndex++;
            }
        }

        this.results.innerHTML = html;

        // Add click handlers
        this.results.querySelectorAll('.command-palette-item').forEach((item) => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index, 10);
                this.selectedIndex = index;
                this._selectCurrent();
            });

            item.addEventListener('mouseenter', () => {
                const index = parseInt(item.dataset.index, 10);
                this.selectedIndex = index;
                this._renderResults();
            });
        });
    }

    /**
     * Select next item
     * @private
     */
    _selectNext() {
        if (this.selectedIndex < this.filteredTemplates.length - 1) {
            this.selectedIndex++;
            this._renderResults();
            this._scrollToSelected();
        }
    }

    /**
     * Select previous item
     * @private
     */
    _selectPrevious() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this._renderResults();
            this._scrollToSelected();
        }
    }

    /**
     * Scroll to keep selected item visible
     * @private
     */
    _scrollToSelected() {
        const selected = this.results.querySelector('.command-palette-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * Select the currently highlighted item
     * @private
     */
    _selectCurrent() {
        const template = this.filteredTemplates[this.selectedIndex];
        if (template && template.available) {
            this.onSelect(template.sql);
            this.close();
        }
    }

    /**
     * Open the command palette
     */
    open() {
        this.isOpen = true;
        this.overlay.classList.add('visible');
        this.input.value = '';
        this.selectedIndex = 0;
        this._updateResults();
        this.input.focus();
    }

    /**
     * Close the command palette
     */
    close() {
        this.isOpen = false;
        this.overlay.classList.remove('visible');
    }

    /**
     * Toggle the command palette
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

/**
 * CSS styles for the command palette
 * Call this once to inject styles
 */
export function injectCommandPaletteStyles() {
    if (document.getElementById('command-palette-styles')) return;

    const style = document.createElement('style');
    style.id = 'command-palette-styles';
    style.textContent = `
        .command-palette-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 15vh;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.15s, visibility 0.15s;
        }

        .command-palette-overlay.visible {
            opacity: 1;
            visibility: visible;
        }

        .command-palette {
            width: 100%;
            max-width: 600px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            transform: translateY(-10px);
            transition: transform 0.15s;
        }

        .command-palette-overlay.visible .command-palette {
            transform: translateY(0);
        }

        .command-palette-header {
            padding: 16px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .command-palette-input {
            flex: 1;
            padding: 12px 16px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 8px;
            outline: none;
        }

        .command-palette-input:focus {
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
        }

        .command-palette-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #666;
            cursor: pointer;
            white-space: nowrap;
        }

        .command-palette-results {
            max-height: 400px;
            overflow-y: auto;
        }

        .command-palette-category {
            padding: 8px 16px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #666;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }

        .command-palette-item {
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.1s;
        }

        .command-palette-item:hover,
        .command-palette-item.selected {
            background: #f0f7ff;
        }

        .command-palette-item.unavailable {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .command-palette-item.unavailable:hover,
        .command-palette-item.unavailable.selected {
            background: #f8f9fa;
        }

        .command-palette-item-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 2px;
        }

        .command-palette-item-description {
            font-size: 13px;
            color: #666;
        }

        .command-palette-item-locked {
            font-size: 12px;
            color: #dc3545;
            margin-top: 4px;
        }

        .command-palette-empty {
            padding: 32px 16px;
            text-align: center;
            color: #666;
        }

        .command-palette-footer {
            padding: 10px 16px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }

        .command-palette-hint {
            font-size: 12px;
            color: #666;
        }

        .command-palette-hint kbd {
            display: inline-block;
            padding: 2px 6px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-family: inherit;
            font-size: 11px;
            margin-right: 4px;
        }
    `;

    document.head.appendChild(style);
}
