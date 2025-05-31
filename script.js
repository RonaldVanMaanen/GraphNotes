// Initialize Quill editor
const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']
        ]
    }
});

// Initialize vis.js network
let network = null;
let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let selectedNodeId = null;
let selectedNodes = [];
let notesData = {
    notes: [],
    links: []
};
let currentTags = new Set();

// Create network
const container = document.getElementById('graph-container');
const data = {
    nodes: nodes,
    edges: edges
};
const options = {
    nodes: {
        shape: 'box',
        margin: 10,
        font: {
            size: 14
        }
    },
    edges: {
        arrows: {
            to: { enabled: true, scaleFactor: 1 }
        }
    },
    physics: {
        stabilization: false
    },
    interaction: {
        multiselect: true,
        selectable: true,
        selectConnectedEdges: false
    }
};

network = new vis.Network(container, data, options);

// Event listeners
network.on('select', function(params) {
    selectedNodeId = params.nodes[0];
    selectedNodes = params.nodes;
    updateButtonStates();
    
    // If it's a single selection, highlight connected nodes
    if (selectedNodes.length === 1) {
        highlightConnectedNodes(selectedNodeId);
        const note = notesData.notes.find(n => n.id === selectedNodeId);
        if (note) {
            quill.root.innerHTML = note.text;
            updateTagsDisplay();
        }
    } else {
        // Reset all nodes to default color if no single selection
        nodes.forEach(node => {
            nodes.update({
                id: node.id,
                color: {
                    background: '#4CAF50',
                    border: '#388E3C'
                }
            });
        });
    }
});

// Add click event handler for nodes
network.on('click', function(params) {
    if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        const note = notesData.notes.find(n => n.id === clickedNodeId);
        if (note) {
            // Only update content if this is a single selection
            if (selectedNodes.length === 1 && selectedNodes[0] === clickedNodeId) {
                selectedNodeId = clickedNodeId;
                quill.root.innerHTML = note.text;
                updateTagsDisplay();
            }
            // Don't update selectedNodes here - let the select event handle it
            updateButtonStates();
        }
    }
});

// Button event listeners
document.getElementById('importBtn').addEventListener('click', importJSON);
document.getElementById('exportBtn').addEventListener('click', exportJSON);
document.getElementById('newNoteBtn').addEventListener('click', createNewNote);
document.getElementById('newChildBtn').addEventListener('click', createChildNote);
document.getElementById('newParentBtn').addEventListener('click', createParentNote);
document.getElementById('renameNoteBtn').addEventListener('click', renameNote);
document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
document.getElementById('deleteNoteBtn').addEventListener('click', deleteNote);
document.getElementById('breakLinkBtn').addEventListener('click', breakLink);
document.getElementById('createLinkBtn').addEventListener('click', createLink);
document.getElementById('insertNoteBtn').addEventListener('click', insertNoteBetween);
document.getElementById('moveLinkBtn').addEventListener('click', moveLink);
document.getElementById('searchInput').addEventListener('input', handleSearch);
document.getElementById('tagInput').addEventListener('keydown', handleTagInput);
document.getElementById('newJSONBtn').addEventListener('click', createNewJSON);

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    console.log('=== Keyboard Event Debug ===');
    console.log('Key pressed:', e.key);
    console.log('Alt key:', e.altKey);
    console.log('Ctrl key:', e.ctrlKey);
    console.log('Meta key:', e.metaKey);
    console.log('Target element:', e.target.tagName);
    console.log('Target class:', e.target.className);
    console.log('Is in editor:', !!e.target.closest('.ql-editor'));
    
    // Special debug for Alt+S
    if (e.key.toLowerCase() === 's') {
        console.log('S key pressed - Alt state:', e.altKey);
        console.log('Event default prevented:', e.defaultPrevented);
        console.log('Event target:', e.target);
    }
    
    // Check if we're not in an input field or editor
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.closest('.ql-editor')) {
        console.log('Processing keyboard shortcut - not in input/editor');
        
        // Alt + N for new note
        if (e.altKey && e.key.toLowerCase() === 'n') {
            console.log('Alt+N detected - creating new note');
            e.preventDefault();
            e.stopPropagation();
            createNewNote();
        }
        // Alt + S for save
        else if (e.altKey && e.key.toLowerCase() === 's') {
            console.log('Alt+S detected - saving note');
            e.preventDefault();
            e.stopPropagation();
            saveNote();
            return false; // Additional prevention of default behavior
        }
        // Alt + O for open
        else if (e.altKey && e.key.toLowerCase() === 'o') {
            console.log('Alt+O detected - opening file');
            e.preventDefault();
            e.stopPropagation();
            importJSON();
        }
        else if (e.altKey && e.key.toLowerCase() === 'e') {
            console.log('Alt+E detected - Exporting file');
            e.preventDefault();
            e.stopPropagation();
            exportJSON();
        }
        // Alt + F for focus search
        else if (e.altKey && e.key.toLowerCase() === 'f') {
            console.log('Alt+F detected - focusing search');
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('searchInput').focus();
        }
        // Alt + C for child note
        else if (e.altKey && e.key.toLowerCase() === 'c') {
            console.log('Alt+C detected - creating child note');
            e.preventDefault();
            e.stopPropagation();
            createChildNote();
        }
        // Alt + P for parent note
        else if (e.altKey && e.key.toLowerCase() === 'p') {
            console.log('Alt+P detected - creating parent note');
            e.preventDefault();
            e.stopPropagation();
            createParentNote();
        }
        // Alt + I for insert between
        else if (e.altKey && e.key.toLowerCase() === 'i') {
            console.log('Alt+I detected - inserting note between');
            e.preventDefault();
            e.stopPropagation();
            insertNoteBetween();
        }
    } else {
        console.log('Ignoring keyboard shortcut - in input field or editor');
    }
    console.log('=== End Keyboard Event Debug ===');
});

// Add a second event listener specifically for Alt+S
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 's') {
        console.log('Alt+S detected in second listener');
        e.preventDefault();
        e.stopPropagation();
        saveNote();
        return false;
    }
}, true); // Using capture phase

// Add search input keyboard shortcuts
document.getElementById('searchInput').addEventListener('keydown', (e) => {
    // Enter to search
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch(e);
    }
    // Escape to clear search
    else if (e.key === 'Escape') {
        e.preventDefault();
        e.target.value = '';
        handleSearch(e);
    }
});

// Add tag input keyboard shortcuts
document.getElementById('tagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        handleTagInput(e);
    }
});

// Initialize or load data
async function initializeData() {
    try {
        const response = await fetch('notes.json');
        if (response.ok) {
            notesData = await response.json();
            updateNetwork();
        } else {
            createDefaultJSON();
        }
    } catch (error) {
        createDefaultJSON();
    }
}

function createDefaultJSON() {
    notesData = {
        notes: [],
        links: []
    };
    saveToFile();
}

function updateNetwork() {
    nodes.clear();
    edges.clear();
    
    notesData.notes.forEach(note => {
        nodes.add({
            id: note.id,
            label: note.title,
            title: note.title
        });
    });
    
    notesData.links.forEach(link => {
        edges.add({
            from: link.from,
            to: link.to
        });
    });
}

function updateButtonStates() {
    const hasSelection = selectedNodeId !== null;
    const hasMultipleSelection = selectedNodes.length >= 2;
    const hasSingleSelection = selectedNodes.length === 1;
    
    // Single selection buttons
    document.getElementById('newChildBtn').disabled = !hasSingleSelection;
    document.getElementById('newParentBtn').disabled = !hasSingleSelection;
    document.getElementById('saveNoteBtn').disabled = !hasSingleSelection;
    document.getElementById('deleteNoteBtn').disabled = !hasSingleSelection;
    document.getElementById('breakLinkBtn').disabled = !hasSingleSelection;
    
    // Multi-selection buttons
    document.getElementById('createLinkBtn').disabled = !hasMultipleSelection;
    document.getElementById('insertNoteBtn').disabled = !hasMultipleSelection;
}

async function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                notesData = JSON.parse(event.target.result);
                document.getElementById('filePath').value = file.name;
                updateNetwork();
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

function exportJSON() {
    // Create a blob with the current notes data
    const blob = new Blob([JSON.stringify(notesData, null, 2)], { type: 'application/json' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.json';
    
    // Append the link to the document
    document.body.appendChild(a);
    
    // Trigger the download
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function promptForTitle(defaultTitle = '') {
    const title = prompt('Enter note title:', defaultTitle);
    return title ? title.trim() : 'Untitled';
}

// Helper function to highlight connected nodes
function highlightConnectedNodes(nodeId) {
    // Reset all nodes to default color
    nodes.forEach(node => {
        nodes.update({
            id: node.id,
            color: {
                background: '#4CAF50',
                border: '#388E3C'
            }
        });
    });

    // Find all connected nodes
    const connectedNodes = new Set();
    notesData.links.forEach(link => {
        if (link.from === nodeId) {
            connectedNodes.add(link.to);
        }
        if (link.to === nodeId) {
            connectedNodes.add(link.from);
        }
    });

    // Highlight connected nodes in blue
    connectedNodes.forEach(connectedId => {
        nodes.update({
            id: connectedId,
            color: {
                background: '#2196F3',
                border: '#1976D2'
            }
        });
    });

    // Highlight the selected node in yellow
    nodes.update({
        id: nodeId,
        color: {
            background: '#ffeb3b',
            border: '#fbc02d'
        }
    });
}

// Update the autoSelectNode function to also highlight connected nodes
function autoSelectNode(nodeId) {
    selectedNodeId = nodeId;
    network.selectNodes([nodeId]);
    updateButtonStates();
    
    // Center the view on the new node
    network.focus(nodeId, {
        scale: 1,
        animation: {
            duration: 500,
            easingFunction: 'easeInOutQuad'
        }
    });
    
    // Highlight connected nodes
    highlightConnectedNodes(nodeId);
}

function createNewNote() {
    const title = promptForTitle('New Note');
    const id = Date.now().toString();
    const note = {
        id: id,
        title: title,
        text: '',
        tags: []
    };
    
    notesData.notes.push(note);
    nodes.add({
        id: id,
        label: note.title,
        title: note.title
    });
    
    // Use the new auto-select helper
    setTimeout(() => autoSelectNode(id), 100);
    saveToFile();
}

function createChildNote() {
    if (!selectedNodeId) return;
    
    const title = promptForTitle('New Child Note');
    const id = Date.now().toString();
    const note = {
        id: id,
        title: title,
        text: '',
        tags: []
    };
    
    notesData.notes.push(note);
    notesData.links.push({
        from: selectedNodeId,
        to: id
    });
    
    updateNetwork();
    // Use the new auto-select helper and load content
    setTimeout(() => {
        autoSelectNode(id);
        quill.root.innerHTML = note.text;
        updateTagsDisplay();
    }, 100);
    saveToFile();
}

function createParentNote() {
    if (!selectedNodeId) return;
    
    const title = promptForTitle('New Parent Note');
    const id = Date.now().toString();
    const note = {
        id: id,
        title: title,
        text: '',
        tags: []
    };
    
    notesData.notes.push(note);
    notesData.links.push({
        from: id,
        to: selectedNodeId
    });
    
    updateNetwork();
    // Use the new auto-select helper and load content
    setTimeout(() => {
        autoSelectNode(id);
        quill.root.innerHTML = note.text;
        updateTagsDisplay();
    }, 100);
    saveToFile();
}

function renameNote() {
    if (!selectedNodeId) {
        alert('Please select a note first');
        return;
    }

    const note = notesData.notes.find(n => n.id === selectedNodeId);
    if (!note) {
        alert('Selected note not found');
        return;
    }

    // Prompt for the new title
    const newTitle = prompt('Enter new title for the note:', note.title);
    
    if (!newTitle) return; // User cancelled
    
    // Update the note title
    note.title = newTitle.trim();
    
    // Update the network visualization
    nodes.update({
        id: note.id,
        label: note.title,
        title: note.title
    });
    
    // Save changes
    saveToFile();
    
    // Show confirmation
    alert(`Note renamed to: ${note.title}`);
}

function saveNote() {
    if (!selectedNodeId) return;
    
    const note = notesData.notes.find(n => n.id === selectedNodeId);
    if (note) {
        const newTitle = promptForTitle(note.title);
        note.title = newTitle;
        note.text = quill.root.innerHTML;
        nodes.update({
            id: note.id,
            label: note.title,
            title: note.title
        });
        saveToFile();
    }
}

function deleteNote() {
    if (!selectedNodeId) return;
    
    // Remove all links connected to this note
    notesData.links = notesData.links.filter(link => 
        link.from !== selectedNodeId && link.to !== selectedNodeId
    );
    
    // Remove the note
    notesData.notes = notesData.notes.filter(note => note.id !== selectedNodeId);
    
    selectedNodeId = null;
    updateNetwork();
    updateButtonStates();
    quill.root.innerHTML = '';
    saveToFile();
}

function breakLink() {
    if (!selectedNodeId) {
        alert('Please select a note first');
        return;
    }

    // Find all links connected to the selected note
    const connectedLinks = notesData.links.filter(link => 
        link.from === selectedNodeId || link.to === selectedNodeId
    );

    if (connectedLinks.length === 0) {
        alert('No links to break for this note');
        return;
    }

    // Create a more user-friendly display of links
    const linkOptions = connectedLinks.map((link, index) => {
        const fromNote = notesData.notes.find(n => n.id === link.from);
        const toNote = notesData.notes.find(n => n.id === link.to);
        const direction = link.from === selectedNodeId ? '→' : '←';
        const otherNote = link.from === selectedNodeId ? toNote : fromNote;
        return `${index + 1}. ${direction} ${otherNote.title}`;
    });

    // Show the links in a more readable format
    const message = `Select the link to break (enter number):\n\n` +
                   `Current note: ${notesData.notes.find(n => n.id === selectedNodeId).title}\n\n` +
                   `Connected links:\n${linkOptions.join('\n')}`;

    const choice = prompt(message, '1');

    if (choice === null) return; // User cancelled

    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= connectedLinks.length) {
        alert('Invalid selection. Please enter a number between 1 and ' + connectedLinks.length);
        return;
    }

    // Break the selected link
    const linkToBreak = connectedLinks[index];
    notesData.links = notesData.links.filter(l => 
        !(l.from === linkToBreak.from && l.to === linkToBreak.to)
    );

    // Update the network visualization
    updateNetwork();
    saveToFile();

    // Show confirmation
    const fromNote = notesData.notes.find(n => n.id === linkToBreak.from);
    const toNote = notesData.notes.find(n => n.id === linkToBreak.to);
    alert(`Link broken between:\n${fromNote.title} → ${toNote.title}`);
}

function createLink() {
    if (selectedNodes.length < 2) {
        alert('Please select two notes to create a link between them');
        return;
    }

    const fromId = selectedNodes[0];
    const toId = selectedNodes[1];

    // Check if link already exists
    const linkExists = notesData.links.some(link => 
        (link.from === fromId && link.to === toId) || 
        (link.from === toId && link.to === fromId)
    );

    if (linkExists) {
        alert('A link already exists between these notes');
        return;
    }

    // Check for circular references
    if (fromId === toId) {
        alert('Cannot create a link to the same note');
        return;
    }

    // Create the new link
    notesData.links.push({
        from: fromId,
        to: toId
    });

    // Update the network visualization
    updateNetwork();
    saveToFile();
}

function insertNoteBetween() {
    if (selectedNodes.length !== 2) {
        alert('Please select exactly two notes to insert a note between them');
        return;
    }

    const [firstId, secondId] = selectedNodes;

    // Check if there's a direct link between the selected notes
    const existingLink = notesData.links.find(link => 
        (link.from === firstId && link.to === secondId) || 
        (link.from === secondId && link.to === firstId)
    );

    if (!existingLink) {
        alert('The selected notes must be directly linked');
        return;
    }

    // Determine parent and child
    const parentId = existingLink.from;
    const childId = existingLink.to;

    // Get the title for the new note
    const title = promptForTitle('New Intermediate Note');
    if (!title) return; // User cancelled

    // Create the new note
    const newNoteId = Date.now().toString();
    const newNote = {
        id: newNoteId,
        title: title,
        text: '',
        tags: []
    };

    // Remove the old link
    notesData.links = notesData.links.filter(link => 
        !(link.from === parentId && link.to === childId)
    );

    // Add the new note
    notesData.notes.push(newNote);

    // Create two new links
    notesData.links.push(
        { from: parentId, to: newNoteId },
        { from: newNoteId, to: childId }
    );

    // Update the network visualization
    updateNetwork();
    // Use the new auto-select helper and load content
    setTimeout(() => {
        autoSelectNode(newNoteId);
        quill.root.innerHTML = newNote.text;
        updateTagsDisplay();
    }, 100);
    saveToFile();
}

function moveLink() {
    if (!selectedNodeId) {
        alert('Please select a note first');
        return;
    }

    // Find all links connected to the selected note
    const connectedLinks = notesData.links.filter(link => 
        link.from === selectedNodeId || link.to === selectedNodeId
    );

    if (connectedLinks.length === 0) {
        alert('No links to move for this note');
        return;
    }

    // Create a more user-friendly display of links
    const linkOptions = connectedLinks.map((link, index) => {
        const fromNote = notesData.notes.find(n => n.id === link.from);
        const toNote = notesData.notes.find(n => n.id === link.to);
        const direction = link.from === selectedNodeId ? '→' : '←';
        const otherNote = link.from === selectedNodeId ? toNote : fromNote;
        return `${index + 1}. ${direction} ${otherNote.title}`;
    });

    // Show the links in a more readable format
    const message = `Select the link to move (enter number):\n\n` +
                   `Current note: ${notesData.notes.find(n => n.id === selectedNodeId).title}\n\n` +
                   `Connected links:\n${linkOptions.join('\n')}`;

    const choice = prompt(message, '1');

    if (choice === null) return; // User cancelled

    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= connectedLinks.length) {
        alert('Invalid selection. Please enter a number between 1 and ' + connectedLinks.length);
        return;
    }

    // Get the link to move
    const linkToMove = connectedLinks[index];
    const isFromNote = linkToMove.from === selectedNodeId;
    const otherNoteId = isFromNote ? linkToMove.to : linkToMove.from;

    // Get all available notes for the new target
    const availableNotes = notesData.notes.filter(note => 
        note.id !== selectedNodeId && 
        note.id !== otherNoteId &&
        !notesData.links.some(link => 
            (link.from === selectedNodeId && link.to === note.id) || 
            (link.from === note.id && link.to === selectedNodeId)
        )
    );

    // Create a list of available notes
    const noteOptions = availableNotes.map((note, index) => {
        return `${index + 1}. ${note.title} (ID: ${note.id})`;
    });

    // Show the available notes in a more readable format
    const newTargetMessage = `Enter the number of the new target note:\n\n` +
                           `Available notes:\n${noteOptions.join('\n')}`;

    const noteChoice = prompt(newTargetMessage);

    if (noteChoice === null) return; // User cancelled

    const noteIndex = parseInt(noteChoice) - 1;
    if (isNaN(noteIndex) || noteIndex < 0 || noteIndex >= availableNotes.length) {
        alert('Invalid selection. Please enter a number between 1 and ' + availableNotes.length);
        return;
    }

    // Get the new target note
    const newTargetNote = availableNotes[noteIndex];
    const newTargetId = newTargetNote.id;

    // Remove the old link
    notesData.links = notesData.links.filter(l => 
        !(l.from === linkToMove.from && l.to === linkToMove.to)
    );

    // Create the new link
    notesData.links.push({
        from: isFromNote ? selectedNodeId : newTargetId,
        to: isFromNote ? newTargetId : selectedNodeId
    });

    // Update the network visualization
    updateNetwork();
    saveToFile();

    // Show confirmation
    const fromNote = notesData.notes.find(n => n.id === (isFromNote ? selectedNodeId : newTargetId));
    const toNote = notesData.notes.find(n => n.id === (isFromNote ? newTargetId : selectedNodeId));
    alert(`Link moved to:\n${fromNote.title} → ${toNote.title}`);
}

async function saveToFile() {
    try {
        const response = await fetch('notes.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notesData, null, 2)
        });
        
        if (!response.ok) {
            console.error('Failed to save file');
        }
    } catch (error) {
        console.error('Error saving file:', error);
    }
}

// Add tag handling functions
function handleTagInput(event) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const input = document.getElementById('tagInput');
        const tags = input.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        if (selectedNodeId) {
            const note = notesData.notes.find(n => n.id === selectedNodeId);
            if (note) {
                tags.forEach(tag => {
                    if (!note.tags.includes(tag)) {
                        note.tags.push(tag);
                    }
                });
                updateTagsDisplay();
                saveToFile();
            }
        }
        
        input.value = '';
    }
}

function updateTagsDisplay() {
    const container = document.getElementById('currentTags');
    container.innerHTML = '';
    
    if (selectedNodeId) {
        const note = notesData.notes.find(n => n.id === selectedNodeId);
        if (note && note.tags) {
            note.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.innerHTML = `
                    ${tag}
                    <span class="remove-tag" data-tag="${tag}">×</span>
                `;
                container.appendChild(tagElement);
            });
        }
    }
}

// Add tag removal functionality
document.getElementById('currentTags').addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-tag')) {
        const tag = event.target.dataset.tag;
        const note = notesData.notes.find(n => n.id === selectedNodeId);
        if (note) {
            note.tags = note.tags.filter(t => t !== tag);
            updateTagsDisplay();
            saveToFile();
        }
    }
});

// Add search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // Reset all nodes to default style
    nodes.forEach(node => {
        nodes.update({
            id: node.id,
            color: { background: '#4CAF50' }
        });
    });
    
    if (searchTerm) {
        notesData.notes.forEach(note => {
            const matches = 
                note.title.toLowerCase().includes(searchTerm) ||
                note.text.toLowerCase().includes(searchTerm) ||
                (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
            if (matches) {
                nodes.update({
                    id: note.id,
                    color: { background: '#ffeb3b' }
                });
            }
        });
    }
}

function createNewJSON() {
    // Prompt for the new JSON file name
    const fileName = prompt('Enter name for new JSON file (without .json extension):', 'new_notes');
    
    if (!fileName) return; // User cancelled
    
    // Create new empty notes data structure
    notesData = {
        notes: [],
        links: []
    };
    
    // Create a blob with the new empty data
    const blob = new Blob([JSON.stringify(notesData, null, 2)], { type: 'application/json' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    
    // Append the link to the document
    document.body.appendChild(a);
    
    // Trigger the download
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Update the network visualization
    updateNetwork();
    saveToFile();
}

// Initialize the application
initializeData();