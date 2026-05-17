
import os

file_path = r"e:\zubrika fashions\style.css"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the start of Search Modal Styles or similar
start_idx = -1
for i, line in enumerate(lines):
    if "/* Search Modal Styles */" in line or ".search-modal {" in line:
        start_idx = i
        break

if start_idx != -1:
    new_lines = lines[:start_idx]
else:
    new_lines = lines

immersive_search_css = """
/* Immersive Search Modal */
.search-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3000;
    display: none;
    background: var(--bg-color);
}

.search-modal.active {
    display: flex;
}

.search-container-full {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 60px 10%;
    position: relative;
    z-index: 2;
}

.search-header-full {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 4px solid var(--primary-color);
    padding-bottom: 20px;
    margin-bottom: 40px;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-grow: 1;
}

.search-icon-inside {
    font-size: 2rem;
    color: var(--primary-color);
}

.full-search-input {
    width: 100%;
    border: none;
    background: none;
    font-size: 3rem;
    font-family: var(--font-heading);
    font-weight: 900;
    text-transform: uppercase;
    outline: none;
    color: var(--primary-color);
}

.close-search-btn-full {
    background: var(--accent-red);
    border: 3px solid var(--primary-color);
    color: #fff;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    cursor: pointer;
    box-shadow: 6px 6px 0px 0px var(--shadow-color);
    transition: all 0.2s;
}

.close-search-btn-full:hover {
    transform: translate(-2px, -2px);
    box-shadow: 8px 8px 0px 0px var(--shadow-color);
}

.search-results-full {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 30px;
    overflow-y: auto;
    padding-bottom: 40px;
}

/* Restoring Timeline Styles that might have been hit */
.tracking-timeline {
    display: flex;
    flex-direction: column;
    gap: 30px;
    position: relative;
    padding-left: 40px;
}

.tracking-timeline::before {
    content: '';
    position: absolute;
    left: 14px;
    top: 5px;
    bottom: 5px;
    width: 4px;
    background: var(--primary-color);
    opacity: 0.2;
}

.timeline-step {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.timeline-dot {
    position: absolute;
    left: -33px;
    top: 5px;
    width: 14px;
    height: 14px;
    background: var(--bg-color);
    border: 3px solid var(--primary-color);
    border-radius: 0;
    z-index: 1;
    transition: all 0.3s;
}

.timeline-step.completed .timeline-dot {
    background: var(--accent-yellow);
    transform: rotate(45deg);
}

.timeline-step.active .timeline-dot {
    background: var(--accent-red);
    box-shadow: 0 0 0 4px var(--bg-color), 0 0 0 7px var(--accent-red);
}

.timeline-label {
    font-weight: 900;
    font-size: 1.1rem;
    text-transform: uppercase;
}

.timeline-time {
    font-size: 0.8rem;
    font-weight: 600;
    opacity: 0.6;
}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
    f.write(immersive_search_css)
